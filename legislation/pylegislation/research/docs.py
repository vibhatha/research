import os
import json
import glob
import csv
from pathlib import Path
from pylegislation.utils import find_project_root

def get_latest_dump(dump_dir):
    list_of_files = glob.glob(os.path.join(dump_dir, '*.json'))
    if not list_of_files:
        return None
    return max(list_of_files, key=os.path.getctime)

def format_title(doc_id):
    return doc_id.replace("-", " ").title()

def update_docs_data():
    """Generate acts.json and all_acts.json for documentation site."""
    project_root = find_project_root()
    
    # Paths (relative to project root)
    # Note: verify what find_project_root returns. If it returns 'research/legislation', then we shouldn't append legislation.
    # If it returns 'research', we should.
    # The output log showed: /Users/vibhatha/github/fork/research/legislation/legislation/reports/...
    # This implies project_root was /Users/vibhatha/github/fork/research/legislation
    # And we appended legislation/reports.
    # So we should remove 'legislation/' from here if find_project_root returns the package root.
    dump_dir = project_root / "reports/database/dump"
    tsv_file = project_root / "reports/research/archive/docs_en_with_domain.tsv"
    
    # Check if docs are in root or sibling? 
    # Based on previous file: "../docs/src/data/" from scripts/ which was in legislation/scripts
    # So it was research/docs/src/data
    output_dir = project_root / "docs/src/data"
    output_acts = output_dir / "acts.json"
    output_all_acts = output_dir / "all_acts.json"

    # 1. Process Dump (Analyzed Acts)
    latest_dump = get_latest_dump(dump_dir)
    analyzed_ids = set()
    
    if latest_dump:
        print(f"Reading dump: {latest_dump}")
        with open(latest_dump, "r") as f:
            data = json.load(f)

        acts_list = []
        for item in data.get("act_analysis", []):
            try:
                content = json.loads(item.get("content_json", "{}"))
                doc_id = item.get("doc_id")
                analyzed_ids.add(doc_id)
                
                title = format_title(doc_id)
                summary_text = content.get("summary", "")
                
                act_entry = {
                    "id": doc_id,
                    "title": title,
                    "summary": summary_text,
                    "category": content.get("category", "Uncategorized"),
                    "sub_category": content.get("sub_category", ""),
                    "entities_count": len(content.get("entities", [])),
                    "timestamp": item.get("timestamp"),
                    "full_content": content 
                }
                acts_list.append(act_entry)
            except Exception as e:
                print(f"Error processing item {item.get('doc_id')}: {e}")

        # Write acts.json
        os.makedirs(output_dir, exist_ok=True)
        with open(output_acts, "w") as f:
            json.dump(acts_list, f, indent=2)
        print(f"Successfully wrote {len(acts_list)} analyzed acts to {output_acts}")
    else:
        print(f"No dump file found in {dump_dir}. Skipping acts.json generation.")

    # 2. Process TSV (All Acts)
    if tsv_file.exists():
        print(f"Reading TSV: {tsv_file}")
        all_acts = []
        try:
            with open(tsv_file, "r", encoding="utf-8") as tsvfile:
                reader = csv.DictReader(tsvfile, delimiter='\t')
                for row in reader:
                    doc_id = row.get("doc_id")
                    
                    # Create Entry
                    entry = {
                        "id": doc_id,
                        "title": row.get("description", doc_id), # description column is usually the Title
                        "number": row.get("doc_number", ""),
                        "date": row.get("date_str", ""),
                        "domain": row.get("domain", "Unknown"),
                        "pdf_url": row.get("url_pdf", ""),
                        "analyzed": doc_id in analyzed_ids
                    }
                    all_acts.append(entry)
            
            # Write all_acts.json
            os.makedirs(output_dir, exist_ok=True)
            with open(output_all_acts, "w") as f:
                json.dump(all_acts, f, indent=2)
            print(f"Successfully wrote {len(all_acts)} total acts to {output_all_acts}")
            
        except Exception as e:
            print(f"Error processing TSV: {e}")
    else:
        print(f"TSV file not found at {tsv_file}")
