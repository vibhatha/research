
import json
import sys
from pathlib import Path
from pylegislation.research.db import create_db_and_tables, engine, ActMetadata, Session
from pylegislation.utils import find_project_root

def migrate_acts_json_to_sqlite():
    create_db_and_tables()
    
    root = find_project_root()
    if not root:
        print("Could not find project root", file=sys.stderr)
        return

    json_path = root / "ui/public/data/acts.json"
    if not json_path.exists():
         print(f"JSON file not found at {json_path}", file=sys.stderr)
         return

    print(f"Loading acts from {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Found {len(data)} acts. Migrating to SQLite...")
    
    with Session(engine) as session:
        count = 0
        for item in data:
            if "doc_id" not in item:
                print(f"Skipping item with missing doc_id: {item}", file=sys.stderr)
                continue
                
            # Check if exists
            existing = session.get(ActMetadata, item["doc_id"])
            if existing:
                continue

            act = ActMetadata(
                doc_id=item["doc_id"],
                doc_type=item.get("doc_type", "lk_acts"),
                num=item.get("num", ""),
                date_str=item.get("date_str", ""),
                description=item.get("description", ""),
                url_metadata=item.get("url_metadata"),
                lang=item.get("lang", "en"),
                url_pdf=item.get("url_pdf"),
                doc_number=item.get("doc_number"),
                domain=item.get("domain"),
                year=item.get("year", "")
            )
            session.add(act)
            count += 1
            
            if count % 100 == 0:
                print(f"Processed {count}...")
        
        session.commit()
    
    print(f"Migration Complete. Added {count} new acts.")

if __name__ == "__main__":
    migrate_acts_json_to_sqlite()
