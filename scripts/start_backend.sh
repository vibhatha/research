#!/bin/bash
set -e

# Migrate metadata
python -m ldf.cli research migrate

# Restore Analysis & Telemetry if dump exists
# Restore Analysis & Telemetry
DUMP_DIR="/app/acts/database/dump"
# Find latest timestamped dump (lexicographically last is latest time)
LATEST_DUMP=$(find "$DUMP_DIR" -name "analysis_dump_*.json" -type f | sort | tail -n 1)

if [ -n "$LATEST_DUMP" ]; then
    echo "Found latest dump file: $LATEST_DUMP. Restoring..."
    python -m ldf.cli research load-analysis "$LATEST_DUMP"
else
    # Fallback to non-timestamped file
    FALLBACK="$DUMP_DIR/analysis_dump.json"
    if [ -f "$FALLBACK" ]; then
        echo "Found fallback dump file at $FALLBACK. Restoring..."
        python -m ldf.cli research load-analysis "$FALLBACK"
    else
        echo "No dump files found in $DUMP_DIR. Skipping restore."
    fi
fi

# Start Backend
exec uvicorn ldf.research.api.main:app --host 0.0.0.0 --port 8000 --reload
