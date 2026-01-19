
import click
from pathlib import Path
from ldf.utils import find_project_root
from ldf.research.categorize import categorize_acts
from ldf.research.lineage import generate_lineage_json
from ldf.research.process import process_acts
from ldf.research.analyze import analyze_base, analyze_custom, analyze_act_by_id, extract_text_fallback, fetch_pdf
from ldf.research.versions import init_versioning, apply_patch, list_versions, get_head_path

PROJECT_ROOT = find_project_root()

@click.group()
def cli():
    """LDF Research Tools CLI"""
    pass

@cli.group()
def research():
    """Research data management commands"""
    pass

@research.command("categorize")
def cmd_categorize():
    """Run categorization logic on archive acts."""
    i = PROJECT_ROOT / 'acts/research/archive/docs_en.tsv'
    o = PROJECT_ROOT / 'acts/research/archive/docs_en_with_domain.tsv'
    categorize_acts(i, o)

@research.command("lineage")
def cmd_lineage():
    """Generate lineage JSON applying patches."""
    i = get_head_path()
    o = PROJECT_ROOT / 'web/public/data/lineage.json'
    p = PROJECT_ROOT / 'acts/research/patches'
    print(f"Generating lineage from {i.name}...")
    generate_lineage_json(i, o, p)

@research.command("process")
def cmd_process():
    """Process acts TSV to flat JSON for web."""
    i = get_head_path()
    o = PROJECT_ROOT / 'web/public/data/acts.json'
    print(f"Processing acts from {i.name}...")
    process_acts(i, o)

# -- Versioning Subcommands --

@research.group("version")
def version_group():
    """Manage data versions."""
    """Manage data versions."""
    pass

@research.command("analyze")
@click.argument("target", required=True) 
@click.option("--api-key", required=True, help="Google API Key")
@click.option("--by-id", is_flag=True, help="Treat target as doc_id instead of path")
def cmd_analyze(target, api_key, by_id):
    """Analyze a local PDF or Act by ID using Gemini."""
    import json
    from ldf.research.analyze import analyze_act_by_id
    
    try:
        if by_id:
            data_path = get_head_path()
            result_json = analyze_act_by_id(target, api_key, data_path, PROJECT_ROOT)
        else:
            result_json = analyze_base(Path(target), api_key)
        
        if not result_json:
             result_json = json.dumps({"error": "Empty response from LLM"})
        
        # Ensure we only print JSON
        print(result_json)
    except Exception as e:
        import traceback
        traceback.print_exc() # print stack to stderr
        print(json.dumps({"error": str(e)})) # Print JSON error for API route to parse safely

@research.command()
def migrate():
    """Migrate Acts JSON to SQLite."""
    from ldf.research.migrate import migrate_acts_json_to_sqlite
    migrate_acts_json_to_sqlite()

@research.command()
@click.argument("output_path", required=False, type=click.Path(path_type=Path))
def dump_analysis(output_path):
    """
    Dump analysis cache to JSON file.
    
    If OUTPUT_PATH is not provided, defaults to saving versioned and latest dumps
    in 'acts/database/dump/'.
    """
    from datetime import datetime
    from ldf.research.dump import dump_analysis_to_json
    
    paths = []
    
    if output_path:
        paths.append(output_path)
    else:
        # Default behavior: Versioned + Latest
        dump_dir = PROJECT_ROOT / "acts/database/dump"
        dump_dir.mkdir(parents=True, exist_ok=True)
        
        # Local time for versioning
        now_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        versioned_name = f"analysis_dump_{now_str}.json"
        
        paths.append(dump_dir / versioned_name)
        
    dump_analysis_to_json(paths)

@research.command()
@click.argument("input_path", type=click.Path(exists=True, path_type=Path))
def load_analysis(input_path):
    """Load analysis cache from JSON file."""
    from ldf.research.dump import load_analysis_from_json
    load_analysis_from_json(input_path)

@version_group.command("init")
def cmd_ver_init():
    """Initialize versioning system."""
    init_versioning()

@version_group.command("list")
def cmd_ver_list():
    """List all data versions."""
    list_versions()

@version_group.command("apply")
@click.option("--file", required=True, help="Path to JSON patch file")
def cmd_ver_apply(file):
    """Apply a patch to create a new version."""
    apply_patch(Path(file))


if __name__ == '__main__':
    cli()

