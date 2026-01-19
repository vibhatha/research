import csv
import json
import re
from pathlib import Path

def slug(name: str) -> str:
    """Create a clean hyphen‑separated slug."""
    name = name.lower()
    name = re.sub(r"[^a-z0-9]+", "-", name)
    name = name.strip("-")
    return name

def main():
    # Input/Output paths
    input_path = Path('acts/research/archive/docs_en_with_domain.tsv')
    output_path = Path('web/public/data/lineage.json')
    
    print(f"Reading from {input_path}")
    
    acts_map = {}
    
    with open(input_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')
        headers = next(reader) 
        # Headers: doc_type, doc_id, num, date_str, description, url_metadata, lang, url_pdf, doc_number, domain
        
        count = 0
        for row in reader:
             # Ensure row has enough columns (at least up to doc_number)
            if len(row) < 9:
                continue
                
            doc_id = row[1]
            date_str = row[3]
            description = row[4]
            url_pdf = row[7]
            doc_number = row[8]
            domain = row[9] if len(row) > 9 else "Other"
            
            try:
                year = int(date_str[:4])
            except ValueError:
                year = 0

            # Normalize title to find base act
            # Remove " (Amendment)" case insensitive
            base_title = re.sub(r'\s*\(Amendment\).*', '', description, flags=re.IGNORECASE).strip()
            
            # Remove "Act No. X of Y" suffix if present in description (though usually description IS the title)
            # Actually, description seems to be "Title", e.g., "National Audit Act"
            
            is_amend = "Amendment" in description
            
            if base_title not in acts_map:
                acts_map[base_title] = {
                    "base_title": base_title,
                    "slug": slug(base_title),
                    "domain": domain,
                    "versions": []
                }
            
            acts_map[base_title]["versions"].append({
                "doc_id": doc_id,
                "year": year,
                "date": date_str,
                "title": description,
                "doc_number": doc_number,
                "is_amendment": is_amend,
                "url_pdf": url_pdf
            })
            count += 1

    # Re-map acts for ID lookup to support the patch logic above
    all_acts_lookup = {}
    for fam in acts_map.values():
        for v in fam["versions"]:
             all_acts_lookup[v["title"]] = v

    # --- Patch Application Logic ---
    patches_dir = Path('web/public/data/patches')
    if patches_dir.exists():
        print(f"Applying patches from {patches_dir}")
        for patch_file in patches_dir.glob('*.json'):
             try:
                with open(patch_file, 'r', encoding='utf-8') as f:
                    patch = json.load(f)
                
                parent_act = patch.get('parent_act')
                changes = patch.get('changes', [])
                
                if parent_act in acts_map:
                    for change in changes:
                        child_title = change.get('child_act')
                        relation = change.get('relationship')
                        
                        # Find the child act object
                        if child_title in all_acts_lookup:
                            child_act_data = all_acts_lookup[child_title]
                            
                            # Add to the family
                            # Avoid duplicates
                            existing_ids = {v['doc_id'] for v in acts_map[parent_act]['versions']}
                            if child_act_data['doc_id'] not in existing_ids:
                                # Create a copy to modify if needed (e.g. mark as amendment)
                                new_version = child_act_data.copy()
                                if relation == "amended_by":
                                    new_version['is_amendment'] = True
                                
                                acts_map[parent_act]['versions'].append(new_version)
                                print(f"Patched: Added {child_title} to {parent_act}")
                        else:
                            print(f"Warning: Could not find act '{child_title}' referenced in patch")
             except Exception as e:
                print(f"Error applying patch {patch_file}: {e}")

    # Convert map to list and sort versions
    lineage_data = []
    for key, data in acts_map.items():
        # Sort versions by year, then by date string
        data["versions"].sort(key=lambda x: (x["year"], x["date"]))
        
        # Only include if interesting (more than 1 version OR specifically marked as amendment link potential)
        # Actually user wants to navigate, so including all is safer, but maybe we highlight "families"
        
        lineage_data.append(data)

    # Sort families alphabetically
    lineage_data.sort(key=lambda x: x["base_title"])
    
    # Save to JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(lineage_data, f, indent=2)
        
    print(f"Processed {count} acts into {len(lineage_data)} families.")
    print(f"Output saved to {output_path}")

if __name__ == "__main__":
    main()
