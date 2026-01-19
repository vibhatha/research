import os
import json
import glob
import csv
from datetime import datetime

# Paths
DUMP_DIR = "acts/database/dump"
TSV_FILE = "acts/research/archive/docs_en_with_domain.tsv"
OUTPUT_ACTS = "docs/src/data/acts.json"
OUTPUT_ALL_ACTS = "docs/src/data/all_acts.json"

def get_latest_dump():
    list_of_files = glob.glob(os.path.join(DUMP_DIR, '*.json'))
    if not list_of_files:
        return None
    return max(list_of_files, key=os.path.getctime)

def format_title(doc_id):
    return doc_id.replace("-", " ").title()

def main():
    # 1. Process Dump (Analyzed Acts)
    latest_dump = get_latest_dump()
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
        os.makedirs(os.path.dirname(OUTPUT_ACTS), exist_ok=True)
        with open(OUTPUT_ACTS, "w") as f:
            json.dump(acts_list, f, indent=2)
        print(f"Successfully wrote {len(acts_list)} analyzed acts to {OUTPUT_ACTS}")
    else:
        print("No dump file found. Skipping acts.json generation.")

    # 2. Process TSV (All Acts)
    if os.path.exists(TSV_FILE):
        print(f"Reading TSV: {TSV_FILE}")
        all_acts = []
        try:
            with open(TSV_FILE, "r", encoding="utf-8") as tsvfile:
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
            os.makedirs(os.path.dirname(OUTPUT_ALL_ACTS), exist_ok=True)
            with open(OUTPUT_ALL_ACTS, "w") as f:
                json.dump(all_acts, f, indent=2)
            print(f"Successfully wrote {len(all_acts)} total acts to {OUTPUT_ALL_ACTS}")
            
        except Exception as e:
            print(f"Error processing TSV: {e}")
    else:
        print(f"TSV file not found at {TSV_FILE}")

if __name__ == "__main__":
    main()
