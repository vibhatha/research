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

def generate_lineage_json(input_path: Path, output_path: Path, patches_dir: Path):
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
    all_acts_lookup_id = {}
    all_acts_lookup_title = {}
    id_to_family_map = {}

    for fam_key, fam in acts_map.items():
        for v in fam["versions"]:
             all_acts_lookup_id[v["doc_id"]] = v
             all_acts_lookup_title[v["title"]] = v
             id_to_family_map[v["doc_id"]] = fam_key

    # --- Patch Application Logic ---
    if patches_dir.exists():
        print(f"Applying patches from {patches_dir}")
        for patch_file in patches_dir.glob('*.json'):
             try:
                with open(patch_file, 'r', encoding='utf-8') as f:
                    patch = json.load(f)
                
                # Determine Parent Family
                parent_key = None
                
                # Method 1: By Parent ID (Preferred)
                parent_id = patch.get('parent_id')
                if parent_id and parent_id in id_to_family_map:
                    parent_key = id_to_family_map[parent_id]
                
                # Method 2: By Parent Title (Legacy)
                if not parent_key:
                    parent_act_title = patch.get('parent_act')
                    if parent_act_title in acts_map:
                        parent_key = parent_act_title
                
                if parent_key and parent_key in acts_map:
                    changes = patch.get('changes', [])
                    for change in changes:
                        child_node = None
                        
                        # Child Lookup 1: By ID
                        child_id = change.get('child_id')
                        if child_id and child_id in all_acts_lookup_id:
                            child_node = all_acts_lookup_id[child_id]
                        
                        # Child Lookup 2: By Title (Legacy)
                        if not child_node:
                            child_title = change.get('child_act')
                            if child_title and child_title in all_acts_lookup_title:
                                child_node = all_acts_lookup_title[child_title]

                        relation = change.get('relationship')
                        
                        if child_node:
                            # Add to the family
                            # Avoid duplicates
                            existing_ids = {v['doc_id'] for v in acts_map[parent_key]['versions']}
                            if child_node['doc_id'] not in existing_ids:
                                # Create a copy to modify if needed (e.g. mark as amendment)
                                new_version = child_node.copy()
                                if relation == "amended_by":
                                    new_version['is_amendment'] = True
                                
                                acts_map[parent_key]['versions'].append(new_version)
                                print(f"Patched: Added {child_node['title']} to {parent_key}")
                        else:
                            print(f"Warning: Could not find child act referenced in patch {patch_file}")
                else:
                    print(f"Warning: Parent Act family not found for patch {patch_file}")

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
