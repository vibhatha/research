from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import os
import sys
import time
import json
from datetime import datetime, timedelta
from typing import List, Optional

# Ensure ldf is in path
sys.path.append(str(Path(__file__).parents[3]))

from ldf.research.analyze import analyze_act_by_id
from ldf.utils import find_project_root
from ldf.research.db import create_db_and_tables, TelemetryLog, ActMetadata, ActAnalysis, engine
from ldf.research.dump import restore_from_latest_dump
from sqlmodel import Session, select, func

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Attempt to restore from latest dump if available
    try:
        restore_from_latest_dump()
    except Exception as e:
        print(f"Startup restoration failed: {e}", file=sys.stderr)
    yield

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = find_project_root() or Path(os.getcwd())

class AnalyzeRequest(BaseModel):
    doc_id: str
    api_key: str
    custom_prompt: Optional[str] = None

class AnalyticsSummary(BaseModel):
    total_requests: int
    total_input_tokens: int
    total_output_tokens: int
    avg_latency_ms: float
    total_cost_est: float
    logs: List[dict]

@app.get("/")
def read_root():
    return {"status": "ok", "service": "ldf-backend"}

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    start_time = time.time()
    try:
        # Determine paths
        # Ideally finding the TSV dynamically or using a standard location
        head_path = PROJECT_ROOT / 'acts/research/archive/docs_en_with_domain.tsv'
        if not head_path.exists():
            # Fallback for dev environment or if path differs in Docker
            head_path = PROJECT_ROOT / 'acts/research/archive/docs_en.tsv'
        
        # Analyze
        result_dict = analyze_act_by_id(request.doc_id, request.api_key, head_path, PROJECT_ROOT, request.custom_prompt)
        
        # Parse result text
        text_content = result_dict.get("text", "")
        try:
            parsed_content = json.loads(text_content)
        except json.JSONDecodeError:
            print(f"DEBUG raw result: {text_content!r}", file=sys.stderr)
            raise
            
        # Log Telemetry
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Estimate Cost (Gemini 2.0 Flash pricing - example)
        # Input: $0.10 / 1M tokens
        # Output: $0.40 / 1M tokens
        input_tokens = result_dict.get("input_tokens", 0)
        output_tokens = result_dict.get("output_tokens", 0)
        cost = (input_tokens * 0.10 / 1_000_000) + (output_tokens * 0.40 / 1_000_000)
        
        with Session(engine) as session:
            log = TelemetryLog(
                doc_id=request.doc_id,
                model=result_dict.get("model", "unknown"),
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                status="SUCCESS",
                cost_usd=cost
            )
            session.add(log)
            session.commit()
            
        return parsed_content
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        # Log Failure
        try:
            latency_ms = int((time.time() - start_time) * 1000)
            with Session(engine) as session:
                log = TelemetryLog(
                    doc_id=request.doc_id,
                    model="failed",
                    input_tokens=0,
                    output_tokens=0,
                    latency_ms=latency_ms,
                    status="FAIL"
                )
                session.add(log)
                session.commit()
        except:
            pass 
            
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/acts")
def get_acts():
    with Session(engine) as session:
        acts = session.exec(select(ActMetadata)).all()
        return acts

@app.get("/acts/{doc_id}")
def get_act_by_id(doc_id: str):
    with Session(engine) as session:
        act = session.get(ActMetadata, doc_id)
        if not act:
            raise HTTPException(status_code=404, detail="Act not found")
        return act

@app.get("/analytics")
def get_analytics():
    with Session(engine) as session:
        # Summary Stats
        total_requests = session.exec(select(func.count(TelemetryLog.id))).one() or 0
        total_input = session.exec(select(func.sum(TelemetryLog.input_tokens))).one() or 0
        total_output = session.exec(select(func.sum(TelemetryLog.output_tokens))).one() or 0
        avg_latency = session.exec(select(func.avg(TelemetryLog.latency_ms))).one() or 0
        total_cost = session.exec(select(func.sum(TelemetryLog.cost_usd))).one() or 0.0
        
        # Recent Logs (Limit 50)
        statement = select(TelemetryLog).order_by(TelemetryLog.timestamp.desc()).limit(50)
        logs = session.exec(statement).all()
        
        return {
            "total_requests": total_requests,
            "total_input_tokens": total_input or 0,
            "total_output_tokens": total_output or 0,
            "avg_latency_ms": float(avg_latency or 0),
            "total_cost_est": float(total_cost or 0),
            "logs": logs
        }

@app.get("/acts/{doc_id}/history")
def get_analysis_history(doc_id: str):
    """Get analysis history for a specific document."""
    from ldf.research.db import Session, engine, select, AnalysisHistory
    
    with Session(engine) as session:
        statement = select(AnalysisHistory).where(AnalysisHistory.doc_id == doc_id).order_by(AnalysisHistory.timestamp.desc())
        history = session.exec(statement).all()
        
    return [
        {
            "id": h.id,
            "timestamp": h.timestamp.isoformat(),
            "prompt": h.prompt,
            "response": h.response,
            "model": h.model
        }
        for h in history
    ]

@app.get("/history/{history_id}")
def get_history_item(history_id: int):
    """Get a specific analysis history item."""
    from ldf.research.db import Session, engine, select, AnalysisHistory
    
    with Session(engine) as session:
        item = session.get(AnalysisHistory, history_id)
        if not item:
            raise HTTPException(status_code=404, detail="History item not found")
            
        return {
            "id": item.id,
            "timestamp": item.timestamp.isoformat(),
            "prompt": item.prompt,
            "response": item.response,
            "model": item.model,
            "doc_id": item.doc_id
        }
