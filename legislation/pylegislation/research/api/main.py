from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
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

import requests
from fastapi.responses import StreamingResponse

from pylegislation.research.analyze import analyze_act_by_id
from pylegislation.utils import find_project_root
from pylegislation.research.db import create_db_and_tables, TelemetryLog, ActMetadata, ActAnalysis, engine
from pylegislation.research.dump import restore_from_latest_dump
from pylegislation.research.versions import get_head_path
from sqlmodel import Session, select, func
import difflib
import csv

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
    force_refresh: bool = False
    fetch_only: bool = False

class ActCreate(BaseModel):
    title: str
    url_pdf: str
    doc_id: Optional[str] = None
    year: Optional[str] = None
    number: Optional[str] = None
    doc_type: str = "lk_acts"

class AnalyticsSummary(BaseModel):
    total_requests: int
    total_input_tokens: int
    total_output_tokens: int
    avg_latency_ms: float
    total_cost_est: float
    logs: List[dict]

@app.get("/")
def read_root():
    return {"status": "ok", "service": "pylegislation-backend"}

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    start_time = time.time()
    try:
        # Determine paths
        # Ideally finding the TSV dynamically or using a standard location
        head_path = PROJECT_ROOT / 'reports/research/archive/docs_en_with_domain.tsv'
        if not head_path.exists():
            # Fallback for dev environment or if path differs in Docker
            head_path = PROJECT_ROOT / 'reports/research/archive/docs_en.tsv'
        
        # Analyze
        result_dict = analyze_act_by_id(
            request.doc_id, 
            request.api_key, 
            head_path, 
            PROJECT_ROOT, 
            request.custom_prompt, 
            request.force_refresh,
            request.fetch_only
        )
        
        if result_dict is None:
             # fetch_only was True and no cache found
             return {"status": "not_found", "detail": "Analysis not found in cache"}
        
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

@app.post("/acts/check-duplicate")
def check_duplicate(act: ActCreate):
    with Session(engine) as session:
        # Check exact match on doc_id if provided
        if act.doc_id:
            existing = session.get(ActMetadata, act.doc_id)
            if existing:
                 return [{"title": existing.description, "doc_id": existing.doc_id, "score": 1.0}]

        # Fuzzy match on description
        all_acts = session.exec(select(ActMetadata)).all()
        titles = [a.description for a in all_acts]
        
        # difflib.get_close_matches returns exact matches too
        matches = difflib.get_close_matches(act.title, titles, n=5, cutoff=0.6)
        
        results = []
        for match in matches:
             # Find the act (inefficient but safe for now)
             found = next((a for a in all_acts if a.description == match), None)
             if found:
                 ratio = difflib.SequenceMatcher(None, act.title, found.description).ratio()
                 results.append({
                     "title": found.description,
                     "doc_id": found.doc_id,
                     "score": ratio
                 })
        
        return results

@app.post("/acts/add")
def add_act(act: ActCreate):
    # generate doc_id if not present
    if not act.doc_id:
        # Simple slug generation or existing pattern? 
        # Existing pattern seems to be date-based or somewhat complex.
        # Let's use a simple safe slug for now: "custom-{year}-{slug}"
        safe_title = "".join(c for c in act.title if c.isalnum() or c in (' ', '-')).replace(" ", "-").lower()
        year = act.year or datetime.now().year
        act.doc_id = f"custom-{year}-{safe_title}"

    with Session(engine) as session:
        # Double check existence
        if session.get(ActMetadata, act.doc_id):
             raise HTTPException(status_code=400, detail=f"Act with ID {act.doc_id} already exists")
        
        new_act = ActMetadata(
            doc_id=act.doc_id,
            doc_type=act.doc_type,
            num=act.number or "",
            date_str=str(act.year) if act.year else "",  # approximate
            description=act.title,
            url_metadata=None,
            lang="en", # default
            url_pdf=act.url_pdf,
            doc_number=act.number,
            domain="Custom",
            year=str(act.year) if act.year else str(datetime.now().year)
        )
        session.add(new_act)
        session.commit()
        session.refresh(new_act)

        # Append to TSV
        # We need to respect the TSV columns:
        # doc_type, doc_id, num, date_str, description, url_metadata, lang, url_pdf, doc_number, domain
        tsv_path = get_head_path()
        try:
             with open(tsv_path, 'a', newline='', encoding='utf-8') as f:
                 writer = csv.writer(f, delimiter='\t')
                 # Ensure we have all columns. 
                 # Current HEAD TSV header check might be good, but assuming standard 10 cols for now as per view_file
                 writer.writerow([
                     new_act.doc_type,
                     new_act.doc_id,
                     new_act.num,
                     new_act.date_str,
                     new_act.description,
                     "", # url_metadata
                     new_act.lang,
                     new_act.url_pdf,
                     new_act.doc_number,
                     new_act.domain
                 ])
        except Exception as e:
            print(f"Failed to append to TSV: {e}", file=sys.stderr)
            # FIXME: Issue #22 (https://github.com/LDFLK/research/issues/22) - Potential data inconsistency between DB and TSV.
            # We don't rollback DB? 
            # Ideally we should, but for this "hacky" feature, DB is primary for UI, TSV is archival.
            pass

        return new_act

@app.post("/acts/batch")
def add_acts_batch(acts: List[ActCreate]):
    results = []
    errors = []
    for act in acts:
        try:
            res = add_act(act)
            results.append(res)
        except Exception as e:
            errors.append({"title": act.title, "error": str(e)})
    
    return {"added": len(results), "errors": errors}

@app.get("/acts")
def get_acts():
    with Session(engine) as session:
        acts = session.exec(select(ActMetadata)).all()
        return acts

@app.api_route("/acts/{doc_id}/pdf", methods=["GET", "HEAD"])
def proxy_pdf(doc_id: str, request: Request):
    with Session(engine) as session:
        act = session.get(ActMetadata, doc_id)
        if not act or not act.url_pdf:
            raise HTTPException(status_code=404, detail="PDF URL not found")
            
    if request.method == "HEAD":
        try:
            r = requests.head(act.url_pdf, allow_redirects=True, timeout=5)
            # Forward status and headers (maybe filter headers?)
            # Just return status code mainly for the existence check
            from fastapi import Response
            return Response(status_code=r.status_code, headers={"Content-Type": "application/pdf"})
        except Exception as e:
            print(f"Proxy HEAD error: {e}")
            raise HTTPException(status_code=404, detail="Remote PDF check failed")

    try:
        # Stream the PDF
        def iterfile():
            with requests.get(act.url_pdf, stream=True) as r:
                r.raise_for_status()
                for chunk in r.iter_content(chunk_size=8192):
                    yield chunk
        
        return StreamingResponse(iterfile(), media_type="application/pdf", headers={"Content-Disposition": "inline; filename=act.pdf"})
    except Exception as e:
        print(f"Proxy error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch upstream PDF")

@app.get("/acts/{doc_id}")
def get_act_by_id(doc_id: str, request: Request):
    with Session(engine) as session:
        act = session.get(ActMetadata, doc_id)
        if not act:
            raise HTTPException(status_code=404, detail="Act not found")
        
        # Check for local HTML override to avoid CORS
        local_html = PROJECT_ROOT / f"ui/public/pdfs/{doc_id}.html"
        if local_html.exists():
             act.url_pdf = f"/pdfs/{doc_id}.html"
        else:
             # Use Proxy for external URLs to ensure Inline Display
             # We assume API is reachable from the client at the same base URL
             base_url = str(request.base_url).rstrip("/")
             act.url_pdf = f"{base_url}/acts/{doc_id}/pdf"
             
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
    from pylegislation.research.db import Session, engine, select, AnalysisHistory
    
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
    from pylegislation.research.db import Session, engine, select, AnalysisHistory
    
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
