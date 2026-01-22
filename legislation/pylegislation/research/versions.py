import json
import csv
import shutil
import argparse
from pathlib import Path
from datetime import datetime
import pylegislation
from pylegislation.utils import find_project_root

# Config
# Resolve root dynamically
PROJECT_ROOT = find_project_root()
VERSIONS_DIR = PROJECT_ROOT / 'reports/research/versions'
ARCHIVE_DIR = PROJECT_ROOT / 'reports/research/archive'
PATCHES_DIR = PROJECT_ROOT / 'reports/research/patches'
MANIFEST_FILE = VERSIONS_DIR / "manifest.json"
BASE_TSV = ARCHIVE_DIR / "docs_en_with_domain.tsv"

def init_versioning():
    """Initialize versioning if not exists."""
    if not VERSIONS_DIR.exists():
        VERSIONS_DIR.mkdir(parents=True)
    if not PATCHES_DIR.exists():
        PATCHES_DIR.mkdir(parents=True)

    if not MANIFEST_FILE.exists():
        print("Initializing versioning system...")
        # create v1 from current base
        v1_path = VERSIONS_DIR / "v1_docs.tsv"
        shutil.copy(BASE_TSV, v1_path)
        
        manifest = {
            "head": "v1",
            "versions": {
                "v1": {
                    "id": "v1",
                    "file": "v1_docs.tsv",
                    "parent": None,
                    "patch": None,
                    "timestamp": datetime.now().isoformat(),
                    "description": "Initial import from docs_en_with_domain.tsv"
                }
            }
        }
        save_manifest(manifest)
        print("Initialized v1.")
    else:
        print("Versioning already initialized.")

def save_manifest(manifest):
    with open(MANIFEST_FILE, 'w') as f:
        json.dump(manifest, f, indent=2)

def load_manifest():
    if not MANIFEST_FILE.exists():
        return None
    with open(MANIFEST_FILE, 'r') as f:
        return json.load(f)

def get_head_path() -> Path:
    """Returns the path to the current HEAD version TSV, or BASE_TSV if not initialized."""
    manifest = load_manifest()
    if manifest:
        head_id = manifest["head"]
        head_ver = manifest["versions"][head_id]
        return VERSIONS_DIR / head_ver["file"]
    return BASE_TSV

def apply_patch(patch_file: Path):
    manifest = load_manifest()
    if not manifest:
        print("Please run init first.")
        return

    head_id = manifest["head"]
    head_ver = manifest["versions"][head_id]
    head_file = VERSIONS_DIR / head_ver["file"]
    
    print(f"Applying patch {patch_file.name} to {head_id}...")
    
    # Load Patch
    with open(patch_file, 'r') as f:
        try:
            patch_data = json.load(f)
        except json.JSONDecodeError:
            print("Invalid JSON.")
            return

    changes = patch_data.get("changes", [])
    parent_act_title = patch_data.get("parent_act")
    
    # Read TSV
    rows = []
    with open(head_file, 'r') as f:
        reader = csv.reader(f, delimiter='\t')
        headers = next(reader)
        rows = list(reader)
        
    # Map descriptions (titles) to rows for lookup
    # CAUTION: This logic assumes description is unique enough or we match strict
    # Ideally we match by Doc ID but patch only has titles currently.
    # In future, patch should have doc_id.
    
    # Apply logic: We are essentially appending NEW ROWS for amendments if they don't exist?
    # Or modification? The current lineage patcher "Adds Relations".
    # In strict storage terms, a relation might be a new column or a different file.
    # But user wants to update the TSV.
    # The TSV doesn't have a "parent" column or "amends" column.
    # It has `description`.
    # If the user adds an amendment relation, it implies the child act AMENDS the parent.
    # This relationship is implicit.
    # HOWEVER, the lineage graph visualization is built from `generate_lineage_json.py`.
    # That script infers lineage from TITLES.
    # To "patch" this in the TSV so the script picks it up, we might need to MODIFY the description of the CHILD act
    # to say " (Amendment)"? 
    # OR, we need a separate "relationships.tsv" file.
    # Given the constraint "tsv files must be properly updated", modifying the original row is risky.
    # BUT, if we add "(Amendment)" to the description, `generate_lineage_json.py` picks it up!
    
    rows_modified = 0
    
    for change in changes:
        child_title = change.get("child_act")
        relationship = change.get("relationship")
        
        if relationship == "amended_by":
            # Find the child row
            for row in rows:
                if len(row) <= 4:
                    continue
                    
                # row[4] is description
                if row[4] == child_title:
                     # Check if it already has "Amendment"
                     if "(Amendment)" not in row[4]:
                         row[4] = f"{row[4]} (Amendment)" # Naive modification to force linkage
                         rows_modified += 1
                         print(f"Updated description for '{child_title}'")
                     else:
                         print(f"Skipping '{child_title}', already marked as Amendment")
    
    if rows_modified == 0:
        print("No changes made to TSV (maybe relations were not 'amended_by' or items not found).")
        return

    # Create New Version
    new_id = f"v{int(head_id[1:]) + 1}"
    new_filename = f"{new_id}_docs.tsv"
    new_path = VERSIONS_DIR / new_filename
    
    with open(new_path, 'w', newline='') as f:
        writer = csv.writer(f, delimiter='\t')
        writer.writerow(headers)
        writer.writerows(rows)
        
    # Update Manifest
    manifest["head"] = new_id
    manifest["versions"][new_id] = {
        "id": new_id,
        "file": new_filename,
        "parent": head_id,
        "patch": patch_file.name,
        "timestamp": datetime.now().isoformat(),
        "description": f"Applied patch {patch_file.name} to {head_id}"
    }
    
    save_manifest(manifest)
    print(f"Created version {new_id} at {new_path}")
    
    # Copy patch to archive
    try:
        shutil.copy(patch_file, PATCHES_DIR / patch_file.name)
    except shutil.SameFileError:
        pass


def list_versions():
    manifest = load_manifest()
    if not manifest:
        print("No versions found.")
        return
        
    print(f"HEAD: {manifest['head']}")
    print("-" * 40)
    for vid, data in manifest["versions"].items():
        print(f"[{vid}] {data['timestamp']} : {data['description']}")


