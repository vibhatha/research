const fs = require('fs');
const path = require('path');

const tsvFile = path.resolve(__dirname, '../acts/research/archive/docs_en_with_domain.tsv');
const outputFile = path.resolve(__dirname, '../web/public/data/acts.json');

console.log(`Reading from: ${tsvFile}`);
console.log(`Writing to: ${outputFile}`);

// Ensure directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

try {
    const fileContent = fs.readFileSync(tsvFile, 'utf-8');
    const lines = fileContent.trim().split('\n');
    const headers = lines[0].split('\t').map(h => h.trim());

    const data = lines.slice(1).map(line => {
        const values = line.split('\t');
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });

        // Enrich data
        if (obj.date_str) {
            obj.year = obj.date_str.split('-')[0];
        }

        return obj;
    });

    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`Successfully processed ${data.length} acts.`);
} catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
}
