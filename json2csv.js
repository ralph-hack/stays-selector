const fs = require('fs');
const { Parser } = require('json2csv');

// Path to your JSON file
const inputFilePath = 'ibague2.json';
// Path to save the generated CSV file
const outputFilePath = 'ibague2.csv';

try {
  // Read the JSON file
  const jsonData = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));
  const searchResults = jsonData.niobeMinimalClientData[0][1].data.presentation.staysSearch.results.searchResults
  // Convert JSON to CSV
  const parser = new Parser();
  const csv = parser.parse(searchResults);

  // Write CSV to a file
  fs.writeFileSync(outputFilePath, csv);

  console.log(`CSV file successfully created at ${outputFilePath}`);
} catch (err) {
  console.error('Error while converting JSON to CSV:', err.message);
}
