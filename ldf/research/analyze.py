import os
from pathlib import Path

import requests
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

def analyze_with_llm(pdf_path: Path, api_key: str) -> str:
    """
    Analyzes a PDF using Google GenAI SDK (Gemini).
    
    Args:
        pdf_path: Path to the local PDF file.
        api_key: Google Gemini API Key.
        
    Returns:
        JSON string containing the analysis.
    """
    from google import genai
    from google.genai import types
    
    client = genai.Client(api_key=api_key)
    
    # Upload the file
    # The new SDK might use different upload syntax, assuming client.files.upload based on search
    # If standard pattern holds:
    file = client.files.upload(file=pdf_path)
    
    prompt = """
    Analyze this legislative act amendment document. 
    Identify the following and return as a VALID JSON object:
    1. "amended_sections": List of section numbers/clauses being amended.
    2. "amendment_type": General nature (e.g., "Repeal", "Substitution", "Insertion").
    3. "effective_date": The date the amendment becomes effective, if mentioned.
    4. "summary": A brief 1-2 sentence summary of the change.
    
    Ensure the output is pure JSON.
    """
    
    # Generate content
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[file, prompt]
    )
    
    text = response.text
    # Sanitize markdown code blocks if present
    if text.startswith("```"):
        import re
        # Remove first line (```json keys) and last line (```)
        text = re.sub(r"^```[a-zA-Z]*\n", "", text)
        text = re.sub(r"\n```$", "", text)
    
    return text.strip()

def analyze_act_by_id(doc_id: str, api_key: str, data_path: Path, project_root: Path) -> str:
    """
    Analyzes an act by its ID, handling PDF download automatically.
    """
    import csv
    
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
    # URL: https://documents.gov.lk/view/acts/2016/10/17-2016_E.pdf
    # or /pdfs/universities-act-16-1978.pdf (if relative)
    
    url_pdf = act_data['url_pdf']
    if not url_pdf:
        raise ValueError(f"No PDF URL found for act {doc_id}")

    # Determine save path
    # Assuming standard structure: web/public/pdfs/{doc_id}.pdf
    pdf_dir = project_root / 'web/public/pdfs'
    pdf_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = pdf_dir / f"{doc_id}.pdf"
    
    if not pdf_path.exists():
        import sys
        print(f"Downloading PDF from {url_pdf}...", file=sys.stderr)
        # Handle relative URLs ?? 
        # For now assume mostly absolute or fixable. 
        # If relative starting with /, might need base domain.
        if url_pdf.startswith('/'):
             # Known domain from dataset or hardcode
             base_domain = "https://documents.gov.lk" # CAUTION: Assumption
             url_pdf = base_domain + url_pdf
             
        fetch_pdf(url_pdf, pdf_path)
    
    return analyze_with_llm(pdf_path, api_key)

