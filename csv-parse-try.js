// const parse = require('csv-parse');
const { parse } = require('csv-parse')

// const input = `name,age,city
// "Alice, Smith",30,"New York, NY"
// "Bob",25,"Los Angeles, CA"
// "Charlie, O'Brian",35,"San Francisco, CA"`;
//const input = `"Top Floor, Views, A/C, Fiber Internet in Laureles",2/4/25 - 2/8/25,4.94,361,https://www.airbnb.com/rooms/18345419?adults=1&amenities%5B0%5D=4&source_impression_id=p3_1711585601_fnQXYMTyV1BirjMU&previous_page_section_name=1000&federated_search_id=9de55503-2d50-4f82-a54c-e76c625e081f&guests=1&check_in=2025-02-04&check_out=2025-02-08,88,,,,,,`;
//  const input = `title,dates,reviewScore
//  "Top Floor, Views, A/C, Fiber Internet in Laureles",2/4/25 - 2/8/25,4.94`;
//  const input = `
//  title,dates,reviewScore
//  "Top Floor, Views, AC, Fiber Internet in Laureles",2/4/25 - 2/8/25,4.94`;
// const input = `
// title,dates,reviewScore
// Laureles,2/4/25 - 2/8/25,4.94`;

parse(
  input,
  {
    columns: true,        // Parse rows into objects using the header row
    skip_empty_lines: true, // Skip empty lines
    quote: '"',            // Default quote character for handling quoted fields
    relax_quotes: true,     // Allow some flexibility in quote handling
    trim: true  
  },
  (err, records) => {
    if (err) {
      console.error("Error parsing CSV:", err);
      return;
    }
    console.log(records);
  }
);