from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import os
import sys

# Ensure ldf is in path
sys.path.append(str(Path(__file__).parents[3]))

from ldf.research.analyze import analyze_act_by_id
from ldf.utils import find_project_root

app = FastAPI()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = find_project_root() or Path(os.getcwd())

class AnalyzeRequest(BaseModel):
    doc_id: str
    api_key: str

@app.get("/")
def read_root():
    return {"status": "ok", "service": "ldf-backend"}

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    try:
        # Determine paths
        # In Docker, we might need to adjust PROJECT_ROOT ??
        # For now assume mounted volume or copied acts
        
        # We need to find where acts.json or tsv is.
        # CLI uses get_head_path() logic.
        data_path = PROJECT_ROOT / 'web/public/data/acts.json' # Or source TSV?
        # analyze_act_by_id logic expects tsv usually ?
        # Let's check analyze_act_by_id signature.
        # It calls: act_data = row from TSV.
        
        # We need the source of truth for PDF URLs. 
        # The web app uses acts.json.
        # But analyze_act_by_id reads TSV.
        
        # Simplification: Let the function decide. 
        # Ideally we should use the same TSV path as CLI: acts/research/archive/docs_en_with_domain.tsv (HEAD)
        
        tsv_path = PROJECT_ROOT / 'acts/research/archive/docs_en.tsv' # Fallback
        
        # Better: use logic to find HEAD.
        from ldf.research.versions import get_head_path
        try:
            head_path = get_head_path()
        except:
            head_path = tsv_path
            
        import json
        result = analyze_act_by_id(request.doc_id, request.api_key, head_path, PROJECT_ROOT)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            print(f"DEBUG raw result: {result!r}", file=sys.stderr)
            raise
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
