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

def generate_lineage_markdown(input_path: Path, output_dir: Path):
    """Generate per-act markdown files with Mermaid diagrams."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Acts gathering logic (simplified re-read or reuse if refactored, but copying/adapting for now)
    # Ideally we'd reuse the maps from json generation, but to keep signature simple strictly following previous script logic
    import csv, re
    
    acts = {}
    with open(input_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if len(row) < 9:
                continue
            # Unpack safely (min 9 cols)
            if len(row) < 9:
                continue
                
            pub_date = row[3]
            title = row[4]
            lang = row[6]
            pdf_url = row[7]
            if lang != "en":
                continue
            try:
                year = int(pub_date[:4])
            except: 
                year = 0
            base = title.replace(" (Amendment)", "")
            is_amend = "(Amendment)" in title
            acts.setdefault(base, {})[year] = {"pdf": pdf_url, "amend": is_amend}

    # Write per-act markdown files
    for act, versions in acts.items():
        file_path = output_dir / f"{slug(act)}.md"
        lines = ["```mermaid", "flowchart TD"]
        nodes = {}
        for yr, info in sorted(versions.items()):
            node_id = f"N{yr}"
            label = f"{act} ({yr})"
            if info["amend"]:
                label = f"{act} (Amendment) ({yr})"
            nodes[yr] = node_id
            lines.append(f'    {node_id}["{label}"]')
        
        sorted_years = sorted(versions)
        for i in range(len(sorted_years) - 1):
            y1, y2 = sorted_years[i], sorted_years[i+1]
            if versions[y2]["amend"]:
                lines.append(f"    {nodes[y1]} -->|amended by| {nodes[y2]}")
        
        for yr, info in versions.items():
            lines.append(f'    click {nodes[yr]} "{info["pdf"]}" "{act} {yr} PDF"')
            
        lines.append("```")
        file_path.write_text("\n".join(lines), encoding="utf-8")

    # Write navigation index
    index_path = output_dir / "index.md"
    year_index = {}
    name_index = {}
    for act, versions in acts.items():
        slug_name = f"{slug(act)}.md"
        for yr, info in versions.items():
            year_index.setdefault(yr, []).append(f"- [{act}{' (Amendment)' if info['amend'] else ''}]({slug_name})")
            name_index.setdefault(act, []).append(f"- [{act}{' (Amendment)' if info['amend'] else ''}]({slug_name})")
            
    lines = ["# Act Version Lineage", "", "## By Year", ""]
    for yr in sorted(year_index, reverse=True):
        lines.append(f"### {yr}")
        lines.extend(year_index[yr])
        lines.append("")
    lines.append("## Alphabetical List")
    for act in sorted(name_index):
        lines.append(f"- [{act}]({slug(act)}.md)")
    index_path.write_text("\n".join(lines), encoding="utf-8")
    print("Lineage files logic executed.")
