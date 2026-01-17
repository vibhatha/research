import os
from pathlib import Path

import requests
import sys
from pypdf import PdfReader

def fetch_pdf(url: str, save_path: Path) -> Path:
    """Downloads a PDF from a URL to the specified path."""
    response = requests.get(url, stream=True)
    response.raise_for_status()
    save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(save_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    return save_path

def extract_text_fallback(pdf_path: Path) -> str:
    """Extracts text from a PDF using pypdf as a fallback."""
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def analyze_base(pdf_path: Path, api_key: str) -> dict:
    """
    Performs the base structural analysis (Summary, Sections, Entities).
    Returns dict with 'text' (JSON string) and token metrics.
    """
    from google import genai
    
    client = genai.Client(api_key=api_key)
    file = client.files.upload(file=pdf_path)
    
    base_prompt = """
    Analyze this legislative act document in detail. 
    Extract the content into a structured JSON object with the following fields:

    1. "summary": A concise summary of what this act is based on and its primary purpose.
    2. "referenced_acts": A list of strings containing the titles of other acts referenced in the text.
    3. "sections": A list of objects, where each object represents a distinct section/clause and contains:
        - "section_number": The section number (e.g., "1", "2(1)", "5A").
        - "content": The full text content of the section.
        - "footnotes": A list of strings containing any side notes, margin notes, or footnotes associated with this section. 
    4. "amendments": (If applicable) A list of specific amendments made, including:
        - "type": e.g., "Repeal", "Substitution", "Insertion".
    5. "entities": A list of objects representing key entities (Departments, Ministries, Persons, Institutes) mentioned in the text. Each object should contain:
        - "entity_name": The name of the entity (e.g., "Department of Agriculture", "Minister of Finance", "University of Colombo").
        - "entity_type": One of "Department", "Ministry", "Person", "Institute", or "Other".
        - "excerpt": A brief text excerpt from the document where this entity is mentioned.
    
    Ensure the output is pure JSON.
    """
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[file, base_prompt]
    )
    
    text = response.text.strip()
    if text.startswith("```"):
        import re
        text = re.sub(r"^```[a-zA-Z]*\s+", "", text)
        text = re.sub(r"\s+```$", "", text)
    
    input_tokens = 0
    output_tokens = 0
    if response.usage_metadata:
        input_tokens = response.usage_metadata.prompt_token_count or 0
        output_tokens = response.usage_metadata.candidates_token_count or 0
        
    return {
        "text": text,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "model": "gemini-2.0-flash"
    }

def analyze_custom(pdf_path: Path, api_key: str, custom_prompt: str) -> dict:
    """
    Performs a specific user query analysis.
    Returns dict with 'answer' (string) and token metrics.
    """
    from google import genai
    
    client = genai.Client(api_key=api_key)
    file = client.files.upload(file=pdf_path)
    
    prompt = f"""
    You are legally analyzing this document.
    The user has a specific question/instruction: "{custom_prompt}"
    
    Provide a direct, detailed answer based strictly on the document content.
    """
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[file, prompt]
    )
    
    input_tokens = 0
    output_tokens = 0
    if response.usage_metadata:
        input_tokens = response.usage_metadata.prompt_token_count or 0
        output_tokens = response.usage_metadata.candidates_token_count or 0
        
    return {
        "answer": response.text.strip(),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens
    }

def analyze_act_by_id(doc_id: str, api_key: str, data_path: Path, project_root: Path, custom_prompt: str = None) -> dict:
    """
    Analyzes an act by its ID, using caching for base structure.
    """
    import csv
    import json
    from ldf.research.db import Session, engine, select, ActAnalysis, AnalysisHistory
    
    # ... (Keep existing path finding logic) ...
    # Find Act Metadata
    act_data = None
    with open(data_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            if row['doc_id'] == doc_id:
                act_data = row
                break
    
    if not act_data:
        raise ValueError(f"Act with ID {doc_id} not found in {data_path}")

    # Determine PDF Path
    url_pdf = act_data['url_pdf']
    if not url_pdf:
        raise ValueError(f"No PDF URL found for act {doc_id}")

    pdf_dir = project_root / 'web/public/pdfs'
    pdf_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = pdf_dir / f"{doc_id}.pdf"
    
    if not pdf_path.exists():
        print(f"Downloading PDF from {url_pdf}...", file=sys.stderr)
        if url_pdf.startswith('/'):
             base_domain = "https://documents.gov.lk"
             url_pdf = base_domain + url_pdf
        fetch_pdf(url_pdf, pdf_path)
    
    # --- Caching Logic ---
    base_json_str = None
    input_tokens = 0
    output_tokens = 0
    model_used = "cached"

    with Session(engine) as session:
        cached = session.get(ActAnalysis, doc_id)
        if cached:
            base_json_str = cached.content_json
            model_used = cached.model
    
    if not base_json_str:
        # Run Base Analysis
        print(f"Running Base Analysis for {doc_id}...", file=sys.stderr)
        base_res = analyze_base(pdf_path, api_key)
        base_json_str = base_res["text"]
        input_tokens += base_res["input_tokens"]
        output_tokens += base_res["output_tokens"]
        model_used = base_res["model"]
        
        # Save to DB
        with Session(engine) as session:
            new_record = ActAnalysis(
                doc_id=doc_id,
                model=model_used,
                content_json=base_json_str
            )
            session.add(new_record)
            session.commit()
            
            # Save Base Analysis to History as well
            base_history = AnalysisHistory(
                doc_id=doc_id,
                prompt="Base Analysis",
                response=base_json_str,
                model=model_used
            )
            session.add(base_history)
            session.commit()
            
    # Parse Base Data
    try:
        data = json.loads(base_json_str)
    except json.JSONDecodeError:
        # If cached data is bad, we might want to re-run, but for now raise
        raise ValueError("Cached analysis data is corrupted.")

    # Handle Custom Prompt
    if custom_prompt:
        print(f"Running Custom Analysis for {doc_id}...", file=sys.stderr)
        custom_res = analyze_custom(pdf_path, api_key, custom_prompt)
        data["custom_analysis"] = custom_res["answer"]
        input_tokens += custom_res["input_tokens"]
        output_tokens += custom_res["output_tokens"]
        model_used = "gemini-2.0-flash" # We definitely used it if custom prompt
        
        # Save History
        with Session(engine) as session:
            history_record = AnalysisHistory(
                doc_id=doc_id,
                prompt=custom_prompt,
                response=custom_res["answer"],
                model=model_used
            )
            session.add(history_record)
            session.commit()
    else:
        # Ensure custom_analysis key exists even if null
        data["custom_analysis"] = None

    return {
        "text": json.dumps(data),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "model": model_used
    }

