import csv
import sys
from pathlib import Path

# Keyword mapping for domains
DOMAIN_KEYWORDS = {
    'Finance & Economy': [
        'finance', 'money', 'tax', 'levy', 'bank', 'monetary', 'loan', 'debt', 'budget', 
        'appropriation', 'economic', 'investment', 'trade', 'customs', 'excise', 'revenue',
        'vat', 'business', 'insurance', 'audit', 'credit', 'securities', 'commodity'
    ],
    'Legal & Judicial': [
        'court', 'justice', 'judge', 'legal', 'law', 'criminal', 'civil', 'penal', 'code',
        'tribunal', 'arbitration', 'evidence', 'notary', 'attorney', 'fraud', 'crime',
        'prison', 'rights', 'constitution', 'judicial', 'mediation'
    ],
    'Education': [
        'education', 'university', 'universities', 'college', 'school', 'institute', 'academy', 'training', 
        'scholarship', 'academic', 'library', 'exam'
    ],
    'Research & Technology': [
        'research', 'science', 'technology'
    ],

    'Health & Safety': [
        'health', 'medical', 'hospital', 'doctor', 'drug', 'medicine', 'disease', 'poison',
        'safety', 'patient', 'nursing', 'food', 'ayurveda', 'organic', 'tobacco', 'alcohol'
    ],
    'Religion & Culture': [
        'buddhist', 'temple', 'church', 'mosque', 'religion', 'culture', 'art', 'museum',
        'heritage', 'foundation', 'incorporation', 'society', 'trust', 'sangha', 'viha'
    ],
    'Agriculture & Environment': [
        'agriculture', 'land', 'forest', 'water', 'environment', 'animal', 'plant', 'farmers',
        'crop', 'fisheries', 'aquatic', 'wildlife', 'coast', 'irrigation', 'pesticide', 'rubber',
        'coconut', 'tea', 'mineral'
    ],
    'Infrastructure & Transport': [
        'transport', 'road', 'highway', 'railway', 'aviation', 'port', 'ship', 'vehicle',
        'traffic', 'construction', 'housing', 'building', 'electricity', 'energy', 'power',
        'telecommunication', 'urban', 'municipal'
    ],
    'Social & Welfare': [
        'welfare', 'social', 'community', 'labour', 'employment', 'worker', 'pension',
        'provident', 'women', 'children', 'youth', 'elder', 'disability', 'samurdhi',
        'relief', 'rehabilitation'
    ],
    'Security & Defense': [
        'defense', 'security', 'army', 'navy', 'air force', 'police', 'terror', 'weapon',
        'firearm', 'explosive', 'military', 'guard', 'intelligence'
    ],
    'Administration': [
        'bureau', 'authority', 'commission', 'board', 'corporation', 'local authorities',
        'provincial council', 'election', 'voter', 'census', 'government', 'public',
        'service', 'department', 'ministry', 'office'
    ]
}

def categorize_description(desc):
    desc_lower = desc.lower()
    scores = {domain: 0 for domain in DOMAIN_KEYWORDS}
    
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for keyword in keywords:
            if keyword in desc_lower:
                scores[domain] += 1
    
    # Get domain with max score
    best_domain = max(scores, key=scores.get)
    
    # If no keywords matched
    if scores[best_domain] == 0:
        return 'Other'
        
    return best_domain

def categorize_acts(input_path: Path, output_path: Path):
    print(f"Reading from {input_path}")
    
    with open(input_path, 'r', encoding='utf-8') as f_in, \
         open(output_path, 'w', encoding='utf-8', newline='') as f_out:
        
        reader = csv.reader(f_in, delimiter='\t')
        writer = csv.writer(f_out, delimiter='\t')
        
        headers = next(reader)
        new_headers = headers + ['domain']
        writer.writerow(new_headers)
        
        count = 0
        for row in reader:
            # Assuming 'description' is at index 4 based on previous file view
            # doc_type, doc_id, num, date_str, description ...
            if len(row) > 4:
                description = row[4]
                domain = categorize_description(description)
                writer.writerow(row + [domain])
                count += 1
            else:
                writer.writerow(row + ['Other'])
                
    print(f"Categorized {count} acts. Output saved to {output_path}")
