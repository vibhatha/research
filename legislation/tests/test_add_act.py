import sys
from pathlib import Path
import os
import shutil
import tempfile
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy import inspect
from sqlalchemy.pool import StaticPool

# Assuming running with pytest, so imports should work if pylegislation is installed
# If not installed, we might need path hack, but let's assume 'pip install -e .' was run
from pylegislation.research.api.main import app
from pylegislation.research.db import ActMetadata, TelemetryLog, ActAnalysis, AnalysisHistory
import pylegislation.research.db
from pylegislation.research.api import main

def test_add_act_flow():
    print("Starting Test Add Act Flow...")
    
    # 1. Setup Temp DB
    test_engine = create_engine(
        "sqlite:///:memory:", 
        connect_args={"check_same_thread": False}, 
        poolclass=StaticPool
    )
    
    print("Metadata tables:", SQLModel.metadata.tables.keys())
    
    SQLModel.metadata.create_all(test_engine)
    
    # Debug tables
    inspector = inspect(test_engine)
    print("Tables created in test_engine:", inspector.get_table_names())
    
    # Setup Temp TSV
    temp_dir = tempfile.mkdtemp()
    temp_tsv = Path(temp_dir) / "test_docs.tsv"
    with open(temp_tsv, "w") as f:
        f.write("doc_type\tdoc_id\tnum\tdate_str\tdescription\turl_metadata\tlang\turl_pdf\tdoc_number\tdomain\n")

    # Patch dependencies
    print(f"Test Engine ID: {id(test_engine)}")
    
    with patch("pylegislation.research.api.main.engine", test_engine) as mocked_engine, \
         patch("pylegislation.research.db.engine", test_engine), \
         patch("pylegislation.research.api.main.get_head_path", return_value=temp_tsv), \
         TestClient(app) as client:
         
        print(f"Engine in main after patch: {id(main.engine)}")
        print(f"Is main.engine == test_engine? {main.engine is test_engine}")

        # Test Case 1: Check Duplicate - found nothing
        print("Test 1: Check Duplicate (Empty)")
        resp = client.post("/acts/check-duplicate", json={
            "title": "New Act 2026",
            "url_pdf": "http://example.com"
        })
        assert resp.status_code == 200
        assert resp.json() == []

        # Test Case 2: Add Act
        print("Test 2: Add Act")
        act_data = {
            "title": "New Act 2026",
            "url_pdf": "http://example.com/act.pdf",
            "year": "2026",
            "number": "12/2026"
        }
        resp = client.post("/acts/add", json=act_data)
        assert resp.status_code == 200
        data = resp.json()
        assert data["description"] == "New Act 2026"
        assert data["doc_id"].startswith("custom-2026")
        
        doc_id = data["doc_id"]
        print(f"Added Act ID: {doc_id}")

        # Verify DB
        with Session(test_engine) as session:
            act = session.get(ActMetadata, doc_id)
            assert act is not None
            assert act.description == "New Act 2026"

        # Verify TSV
        with open(temp_tsv, "r") as f:
            content = f.read()
            assert doc_id in content
            assert "New Act 2026" in content

        # Test Case 3: Check Duplicate - found exact/fuzzy
        print("Test 3: Check Duplicate (Found)")
        resp = client.post("/acts/check-duplicate", json={
            "title": "New Act 2026", # Exact title match check
            "url_pdf": "..." 
        })
        results = resp.json()
        assert len(results) > 0
        assert results[0]["doc_id"] == doc_id
        
        # Test Case 4: Batch Add
        print("Test 4: Batch Add")
        batch_data = [
            {"title": "Batch Act 1", "url_pdf": "http://1.pdf"},
            {"title": "Batch Act 2", "url_pdf": "http://2.pdf"}
        ]
        resp = client.post("/acts/batch", json=batch_data)
        assert resp.status_code == 200
        assert resp.json()["added"] == 2
        
    # Cleanup
    shutil.rmtree(temp_dir)
    print("Tests Passed Successfully!")
