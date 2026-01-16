#!/usr/bin/env python3
import csv, pathlib, re, sys

TSV = pathlib.Path("acts/submodule/lk_legal_docs/data/lk_acts/docs_all.tsv")
OUT_DIR = pathlib.Path("acts/research/lineage")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def slug(name: str) -> str:
    """Create a clean hyphen‑separated slug.
    Lower‑case, replace any non‑alphanumeric sequence with a single hyphen,
    and strip leading/trailing hyphens.
    """
    name = name.lower()
    # replace anything that is not a letter or number with hyphen
    name = re.sub(r"[^a-z0-9]+", "-", name)
    name = name.strip("-")
    return name

acts = {}
with TSV.open("r", encoding="utf-8") as f:
    reader = csv.reader(f, delimiter="\t")
    for row in reader:
        if len(row) < 9:
            continue
        _, _, _, pub_date, title, _, lang, pdf_url, _ = row
        if lang != "en":
            continue
        year = int(pub_date[:4])
        base = title.replace(" (Amendment)", "")
        is_amend = "(Amendment)" in title
        acts.setdefault(base, {})[year] = {"pdf": pdf_url, "amend": is_amend}

# Write per‑act markdown files with Mermaid diagrams
for act, versions in acts.items():
    file_path = OUT_DIR / f"{slug(act)}.md"
    lines = ["```mermaid", "flowchart TD"]
    nodes = {}
    for yr, info in sorted(versions.items()):
        node_id = f"N{yr}"
        label = f"{act} ({yr})"
        if info["amend"]:
            label = f"{act} (Amendment) ({yr})"
        nodes[yr] = node_id
        lines.append(f'    {node_id}["{label}"]')
    # add edges (original -> amendment)
    sorted_years = sorted(versions)
    for i in range(len(sorted_years) - 1):
        y1, y2 = sorted_years[i], sorted_years[i+1]
        if versions[y2]["amend"]:
            lines.append(f"    {nodes[y1]} -->|amended by| {nodes[y2]}")
    # clickable links
    for yr, info in versions.items():
        lines.append(f'    click {nodes[yr]} "{info["pdf"]}" "{act} {yr} PDF"')
    lines.append("```")
    file_path.write_text("\n".join(lines), encoding="utf-8")

# Write navigation index
index_path = OUT_DIR / "index.md"
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
print("Lineage files regenerated with clean hyphen slugs under", OUT_DIR)
