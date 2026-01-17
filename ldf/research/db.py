from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session, select, func
from pathlib import Path

import os

# Database Setup
sqlite_file_name = "research.db"
# Use absolute path for Docker/Local consistency
BASE_DIR = Path(__file__).parent.parent.parent
sqlite_url = f"sqlite:///{BASE_DIR}/data/{sqlite_file_name}"

engine = create_engine(sqlite_url)

def create_db_and_tables():
    # Ensure data dir exists
    (BASE_DIR / "data").mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# Export for use
__all__ = ["TelemetryLog", "ActMetadata", "ActAnalysis", "AnalysisHistory", "engine", "create_db_and_tables", "Session", "select", "func"]

# Models

class TelemetryLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    doc_id: str = Field(index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    model: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    status: str # "SUCCESS" or "FAIL"
    cost_usd: Optional[float] = None

class ActAnalysis(SQLModel, table=True):
    doc_id: str = Field(primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    model: str
    # Storing the full JSON result as a string/text blob
    content_json: str
    # We can separate base tokens schema if needed, but keeping it simple for now
    
class AnalysisHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    doc_id: str = Field(index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    prompt: str
    response: str
    # We could store model used here too if needed, but keeping it simple
    model: str = "gemini-2.0-flash"

class ActMetadata(SQLModel, table=True):
    doc_id: str = Field(primary_key=True)
    doc_type: str
    num: str
    date_str: str
    description: str
    url_metadata: Optional[str] = None
    lang: str
    url_pdf: Optional[str] = None
    doc_number: Optional[str] = None
    domain: Optional[str] = None
    year: str
