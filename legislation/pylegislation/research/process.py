import csv
import json
from pathlib import Path

def process_acts(input_path: Path, output_path: Path):
    print(f"Reading from: {input_path}")
    print(f"Writing to: {output_path}")

    if not output_path.parent.exists():
        output_path.parent.mkdir(parents=True)

    data = []
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            headers = next(reader)
            
            for row in reader:
                obj = {}
                for index, value in enumerate(row):
                    if index < len(headers):
                        obj[headers[index]] = value.strip()
                
                # Enrich data
                if 'date_str' in obj and obj['date_str']:
                    obj['year'] = obj['date_str'].split('-')[0]
                
                data.append(obj)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        print(f"Successfully processed {len(data)} acts.")
        
    except Exception as e:
        print(f"Error processing file: {e}")
        exit(1)
