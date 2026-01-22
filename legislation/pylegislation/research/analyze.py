import os
from pathlib import Path

import requests
import sys
from pypdf import PdfReader


def fetch_document(url: str, save_path: Path) -> Path:
    """Downloads a document (PDF/HTML) from a URL to the specified path."""
    response = requests.get(url, stream=True)
    response.raise_for_status()
    save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(save_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    return save_path

# Backward compatibility alias if needed, or just replace usage
fetch_pdf = fetch_document

def extract_text_fallback(pdf_path: Path) -> str:
    """Extracts text from a PDF using pypdf as a fallback."""
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def analyze_base(doc_path: Path, api_key: str) -> dict:
    """
    Performs the base structural analysis (Summary, Sections, Entities).
    Returns dict with 'text' (JSON string) and token metrics.
    """
    from google import genai
    
    from pylegislation.research.categorize import DOMAIN_KEYWORDS

    client = genai.Client(api_key=api_key)
    
    # Handle Content Type
    if doc_path.suffix.lower() in ['.html', '.htm']:
        # For HTML, we pass the text content directly to Gemini
        # It handles raw HTML well.
        # TODO: check this logic with practical examples
        try:
            content_part = doc_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            print(f"Warning: UTF-8 decode failed for {doc_path}, retrying with latin-1", file=sys.stderr)
            content_part = doc_path.read_text(encoding='latin-1', errors='replace')
    else:
        # Default to PDF File Upload
        content_part = client.files.upload(file=doc_path)
    
    # improved prompt with categorization
    base_prompt = f"""
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
    6. "category": Choose the most relevant major category from this list: {list(DOMAIN_KEYWORDS.keys())}.
    7. "sub_category": Based on the keywords associated with the chosen category, provide a specific sub-category or keyword that matches the content (e.g., if 'Security & Defense' is chosen, sub-category could be 'Navy' or 'Police' if relevant).
    8. "meeting_details": A list of objects containing information about meetings mentioned in the act. If no meetings are mentioned, return an empty list []. Each object should contain:
        - "description": Description of the meeting type/purpose.
        - "frequency": How often they meet (e.g., "Monthly", "Quarterly", "Annual").
        - "location": Where they meet, if specified.
        - "time": Time of meeting, if specified.
        - "excerpt": Text excerpt from which this info was derived.
    9. "board_members": A list of objects describing board/committee member details. If no members are mentioned, return an empty list []. Each object should contain:
        - "role_name": Name of the role (e.g., "Chairman", "Member").
        - "appointing_authority": Who appoints this member (e.g., "Minister").
        - "removal_criteria": Conditions for removal (e.g., "Absence from 3 consecutive meetings").
        - "composition_criteria": Any criteria for selection (e.g., "Must be a lawyer").
        - "excerpt": Relevant text excerpt.
    
    Ensure the output is pure JSON.
    """
    
    from google.genai import types
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[content_part, base_prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=None, 
            max_output_tokens=65536, # Ensure high limit for large documents
        )
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

def analyze_custom(doc_path: Path, api_key: str, custom_prompt: str) -> dict:
    """
    Performs a specific user query analysis.
    Returns dict with 'answer' (string) and token metrics.
    """
    from google import genai
    
    client = genai.Client(api_key=api_key)
    
    if doc_path.suffix.lower() in ['.html', '.htm']:
        try:
            content_part = doc_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            print(f"Warning: UTF-8 decode failed for {doc_path}, retrying with latin-1", file=sys.stderr)
            content_part = doc_path.read_text(encoding='latin-1', errors='replace')
    else:
        content_part = client.files.upload(file=doc_path)
    
    prompt = f"""
    You are legally analyzing this document.
    The user has a specific question/instruction: "{custom_prompt}"
    
    Provide a direct, detailed answer based strictly on the document content.
    """
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[content_part, prompt]
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

def analyze_act_by_id(doc_id: str, api_key: str, data_path: Path, project_root: Path, custom_prompt: str = None, force_refresh: bool = False, fetch_only: bool = False) -> dict:
    """
    Analyzes an act by its ID, using caching for base structure.
    """
    import csv
    import json
    from pylegislation.research.db import Session, engine, select, ActAnalysis, AnalysisHistory
    
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

    # Determine Document URL and Type
    url_source = act_data['url_pdf']
    if not url_source:
        raise ValueError(f"No source URL found for act {doc_id}")

    # Infer extension
    is_html = url_source.lower().endswith('.html') or url_source.lower().endswith('.htm')
    ext = '.html' if is_html else '.pdf'

    pdf_dir = project_root / 'web/public/pdfs'
    pdf_dir.mkdir(parents=True, exist_ok=True)
    doc_path = pdf_dir / f"{doc_id}{ext}"
    
    if not doc_path.exists():
        print(f"Downloading Document from {url_source}...", file=sys.stderr)
        if url_source.startswith('/'):
             base_domain = "https://documents.gov.lk"
             url_source = base_domain + url_source
        fetch_document(url_source, doc_path)
    
    # --- Caching Logic ---
    base_json_str = None
    input_tokens = 0
    output_tokens = 0
    model_used = "cached"
    data = None

    if not force_refresh:
        with Session(engine) as session:
            cached = session.get(ActAnalysis, doc_id)
            if cached:
                base_json_str = cached.content_json
                model_used = cached.model

                # Validate Cache Integrity
                if base_json_str:
                    try:
                        json.loads(base_json_str)
                    except json.JSONDecodeError:
                        print(f"WARN: Cached analysis for {doc_id} is corrupted. Forcing re-analysis.", file=sys.stderr)
                        base_json_str = None
    
    # Validating/Healing JSON logic
    def repair_json(json_str: str) -> str:
        """Attempts to repair truncated JSON by closing brackets."""
        json_str = json_str.strip()
        # Simple heuristic: count brackets
        open_braces = json_str.count('{') - json_str.count('}')
        open_brackets = json_str.count('[') - json_str.count(']')
        
        # This is a naive repair, but handles simple truncation
        # Reverse order of closing ideally, but for now just appending might work for simple cases.
        # A better way is to check the last char.
        return json_str + ("}" * open_braces) + ("]" * open_brackets)

    if not base_json_str:
        if fetch_only:
            return None

        # Run Base Analysis (Single Execution with Repair)
        print(f"Running Base Analysis for {doc_id} (force_refresh={force_refresh})...", file=sys.stderr)
        base_res = analyze_base(doc_path, api_key)
        base_json_str = base_res["text"]
        input_tokens += base_res["input_tokens"]
        output_tokens += base_res["output_tokens"]
        model_used = base_res["model"]
        
        # Validate and Repair JSON
        try:
            data = json.loads(base_json_str)
        except json.JSONDecodeError as e:
            print(f"WARN: JSON parse failed: {e}", file=sys.stderr)
            print("INFO: Attempting to auto-repair JSON...", file=sys.stderr)
            
            repaired_str = repair_json(base_json_str)
            try:
                data = json.loads(repaired_str)
                base_json_str = repaired_str
                print("INFO: JSON repaired successfully.", file=sys.stderr)
            except json.JSONDecodeError as repair_e:
                print(f"ERROR: Auto-repair failed: {repair_e}", file=sys.stderr)
                raise ValueError(f"Generated analysis is corrupted and repair failed: {e}")

        # Save to DB
        with Session(engine) as session:
            new_record = ActAnalysis(
                doc_id=doc_id,
                model=model_used,
                content_json=base_json_str
            )
            session.merge(new_record)  # Use merge for upsert
            session.commit()
            
            # Save Base Analysis to History as well
            base_history = AnalysisHistory(
                doc_id=doc_id,
                prompt="Base Analysis (Refresh)" if force_refresh else "Base Analysis",
                response=base_json_str,
                model=model_used
            )
            session.add(base_history)
            session.commit()
            
    # Parse Base Data (already parsed above if new, or here if cached)
    if not data:
        data = json.loads(base_json_str)

    # Handle Custom Prompt
    if custom_prompt:
        print(f"Running Custom Analysis for {doc_id}...", file=sys.stderr)
        custom_res = analyze_custom(doc_path, api_key, custom_prompt)
        data["custom_analysis"] = custom_res["answer"]
        data["custom_prompt"] = custom_prompt
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
        data["custom_prompt"] = None

    return {
        "text": json.dumps(data),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "model": model_used
    }

