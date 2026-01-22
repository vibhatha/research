from datetime import datetime
import json
import sys
from pathlib import Path
from sqlmodel import Session, select
from pylegislation.research.db import engine, ActAnalysis, TelemetryLog, AnalysisHistory, create_db_and_tables

def dump_analysis_to_json(output_paths: list[Path]):
    """Dumps DB records (Analysis + Telemetry + History) to one or more JSON files."""
    if not output_paths:
        return

    # Ensure tables exist (to avoid crash if dumping on fresh system)
    create_db_and_tables()

    with Session(engine) as session:
        analyses = session.exec(select(ActAnalysis)).all()
        telemetry = session.exec(select(TelemetryLog)).all()
        history = session.exec(select(AnalysisHistory)).all()

    data = {
        "act_analysis": [],
        "telemetry_log": [],
        "analysis_history": []
    }
    
    # Dump Analysis
    for r in analyses:
        data["act_analysis"].append({
            "doc_id": r.doc_id,
            "timestamp": r.timestamp.isoformat(),
            "model": r.model,
            "content_json": r.content_json
        })
        
    # Dump Telemetry
    for t in telemetry:
        data["telemetry_log"].append({
            "id": t.id,
            "doc_id": t.doc_id,
            "timestamp": t.timestamp.isoformat(),
            "model": t.model,
            "input_tokens": t.input_tokens,
            "output_tokens": t.output_tokens,
            "latency_ms": t.latency_ms,
            "status": t.status,
            "cost_usd": t.cost_usd
        })

    # Dump History
    for h in history:
        data["analysis_history"].append({
            "id": h.id,
            "doc_id": h.doc_id,
            "timestamp": h.timestamp.isoformat(),
            "prompt": h.prompt,
            "response": h.response,
            "model": h.model
        })
        
    for path in output_paths:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"Dumped {len(analyses)} analyses, {len(telemetry)} logs, {len(history)} history items to {path}")

def load_analysis_from_json(input_path: Path):
    """Loads DB records from a JSON file."""
    if not input_path.exists():
        print(f"File {input_path} not found.")
        return

    with open(input_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
        
    # Handle Legacy format (list of analyses) or dict
    if isinstance(raw_data, list):
        analyses_data = raw_data
        telemetry_data = []
        history_data = []
    else:
        analyses_data = raw_data.get("act_analysis", [])
        telemetry_data = raw_data.get("telemetry_log", [])
        history_data = raw_data.get("analysis_history", [])

    create_db_and_tables()
    
    with Session(engine) as session:
        # Counters
        count_ana = 0
        count_tel = 0
        count_hist = 0

        # Restore Analysis & Backfill History
        for item in analyses_data:
            # 1. Restore ActAnalysis (Cache)
            if not session.get(ActAnalysis, item["doc_id"]): 
                record = ActAnalysis(
                    doc_id=item["doc_id"],
                    timestamp=datetime.fromisoformat(item["timestamp"]),
                    model=item["model"],
                    content_json=item["content_json"]
                )
                session.add(record)
                count_ana += 1
            
            # 2. Backfill History (Base Analysis) if missing
            # This ensures legacy dumps or missing logs are restored even if cache existed
            
            # Check if this specific base analysis is already in history
            # We match on doc_id, "Base Analysis", and timestamp to avoid duplicates
            target_ts = datetime.fromisoformat(item["timestamp"])
            
            statement = select(AnalysisHistory).where(
                AnalysisHistory.doc_id == item["doc_id"],
                AnalysisHistory.prompt == "Base Analysis",
                AnalysisHistory.timestamp == target_ts
            )
            existing_hist = session.exec(statement).first()
            
            if not existing_hist:
                # Also check if we have it in the history_data list we are about to process
                # (To avoid double adding if the dump actually HAS history)
                in_dump_history = False
                for h in history_data:
                     if (h["doc_id"] == item["doc_id"] and 
                         h.get("prompt") == "Base Analysis" and 
                         h["timestamp"] == item["timestamp"]):
                         in_dump_history = True
                         break
                
                if not in_dump_history:
                    base_hist = AnalysisHistory(
                        doc_id=item["doc_id"],
                        timestamp=target_ts,
                        prompt="Base Analysis",
                        response=item["content_json"],
                        model=item["model"]
                    )
                    session.add(base_hist)
                    count_hist += 1

        # Restore Telemetry
        count_tel = 0
        for item in telemetry_data:
             if item.get("id") and session.get(TelemetryLog, item["id"]):
                 continue
                 
             rec = TelemetryLog(
                doc_id=item["doc_id"],
                timestamp=datetime.fromisoformat(item["timestamp"]),
                model=item["model"],
                input_tokens=item["input_tokens"],
                output_tokens=item["output_tokens"],
                latency_ms=item["latency_ms"],
                status=item["status"],
                cost_usd=item["cost_usd"]
             )
             if item.get("id"):
                 rec.id = item["id"]
                 
             session.add(rec)
             count_tel += 1

        # Restore Explicit History (from dump)
        for item in history_data:
             if item.get("id") and session.get(AnalysisHistory, item["id"]):
                 continue
                 
             rec = AnalysisHistory(
                doc_id=item["doc_id"],
                timestamp=datetime.fromisoformat(item["timestamp"]),
                prompt=item.get("prompt", ""),
                response=item.get("response", ""),
                model=item.get("model", "gemini-2.0-flash")
             )
             if item.get("id"):
                 rec.id = item["id"]
                 
             session.add(rec)
             count_hist += 1
        
        session.commit()
        
    print(f"Restored {count_ana} analyses, {count_tel} logs, {count_hist} history items from {input_path}")

def restore_from_latest_dump():
    """Finds the latest analysis dump and restores it to the database."""
    from pylegislation.utils import find_project_root
    
    root = find_project_root()
    if not root:
        return
        
    dump_dir = root / "acts/database/dump"
    if not dump_dir.exists():
        return
        
    # Find all dump files
    dumps = sorted(dump_dir.glob("analysis_dump_*.json"))
    
    if not dumps:
        print("No analysis dumps found to restore.")
        return
        
    latest_dump = dumps[-1]
    print(f"Auto-restoring from latest dump: {latest_dump.name}")
    load_analysis_from_json(latest_dump)
