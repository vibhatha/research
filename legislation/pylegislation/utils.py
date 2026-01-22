from pathlib import Path
import os

def find_project_root(marker_file: str = "environment.yml") -> Path:
    """
    Finds the project root by searching upwards from the current working directory
    for a marker file (default: environment.yml).
    
    If not found, returns the current working directory.
    """
    current_dir = Path(os.getcwd()).resolve()
    
    for parent in [current_dir] + list(current_dir.parents):
        if (parent / marker_file).exists():
            return parent
            
    # If explicit marker not found, check for .git directory
    for parent in [current_dir] + list(current_dir.parents):
        if (parent / ".git").exists():
            return parent
            
    # Fallback to current directory (user might be running from root anyway)
    return current_dir
