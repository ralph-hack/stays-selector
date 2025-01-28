const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

function listFilesExample(){
    console.log('EXAMPLE: listFilesExample()');
    // Usage example
    const directoryPath = 'merge'; 
    const allFiles = getAllFiles(directoryPath, []);

    console.log(allFiles);
}

// const fs = require('fs');
const { parse } = require('csv-parse');

function csvParseExample(){
    console.log('EXAMPLE: csvParseExample()');
    const filePath = 'merge/Airbnb - colombiacustom1searchResults.csv'; 

    const results = [];

    fs.createReadStream(filePath)
    .pipe(parse({ 
        delimiter: ',', // Adjust if your CSV uses a different delimiter (e.g., ';', '\t')
        from_line: 2, // Skip header row (optional)
        columns: true // If your CSV has a header row 
    }))
    .on('data', (row) => {
        results.push(row); 
    })
    .on('end', () => {
        console.log(results); 
    })
    .on('error', (error) => {
        console.error(error);
    });
}



//listFilesExample();
//csvParseExample();



function parseCSV(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      const results = [];
      const defaultOptions = {
        delimiter: ',', 
        from_line: 1, 
        columns: true 
      };
      const mergedOptions = { ...defaultOptions, ...options };
  
      fs.createReadStream(filePath)
        .pipe(parse(mergedOptions))
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', () => {
          resolve(results); 
        })
        .on('error', (error) => {
          reject(error); 
        });
    });
  }
  
  function parseCSVExample() {
    console.log('EXAMPLE: parseCSVExample()');
    // Usage example
    const filePath = 'merge/Airbnb - bucaramangacustom1searchResults.csv';
    
    parseCSV(filePath)
        .then(data => {
        console.log(data); 
        })
        .catch(error => {
        console.error('Error parsing CSV:', error);
        });
    }

 //   const fs = require('fs');
//const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

async function mergeCSVs(files, outputFile, options = {}) {

    try {
      const defaultOptions = {
        delimiter: ',', 
        from_line: 1, 
        columns: true ,
         relax_column_count: true,
        quote: '"', escape: '"',
        skip_empty_lines: true ,
        relax_quotes: true 
      };
      const mergedOptions = { ...defaultOptions, ...options };
  
      const allColumns = new Set();
      const allData = [];
  
      for (const file of files) {
        console.log('HEEEEELLLLLLLLOOOO: ',file);
        // try{
            const data = await new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(file)
                .pipe(parse(mergedOptions))
                .on('data', (row) => {
                 // console.log('data received')
                Object.keys(row).forEach(col =>{
                    allColumns.add(col);
                });
                results.push(row);
                })
                .on('end', () => {
                resolve(results);
                })
                .on('error', (error) => {
                reject(error);
                });
            });
            allData.push(...data);
        // }
        // catch(error){
        //     //console.log(error);
        // }
      }
console.log('all columns',allColumns.values());
      // Create a mapping of column names to their index
      const columnMap = {};
      allColumns.forEach((col, index) => {
        columnMap[col] = index;
      });
  
      // Transform data to match the order of all columns
      const transformedData = allData.map(row => {
        const newRow = {}; 
        allColumns.forEach(col => {
        
          newRow[col] = row[col] || null; 


          // ###### DEBUG REMOVE #######
          // if(row[col]?.indexOf('Fiber Internet in Laureles')>-1){
          //   console.log('Found: ',newRow[col]);
          // }
          // ###### DEBUG REMOVE #######

          if(row[col]?.indexOf(',')>-1){
            newRow[col] = `"${row[col]}"`; // Escape commas
          }
        });
        
        return Object.values(newRow); 
      });

      console.log('num columns',Object.values(transformedData).length);//, transformedData);
    //   const stringifier = stringify({ delimiter: mergedOptions.delimiter }); 
    //   const writableStream = fs.createWriteStream(outputFile);
  
    //   stringifier.pipe(writableStream);
    //   stringifier.write(Array.from(allColumns).join(',') + '\n'); // Write the header row
    //   transformedData.map(row => {
    //     //console.log('row',row);
    //     try{
    //     stringifier.write(row.join(',') + '\n'); // Write each row individually
    //     //console.log('success')
    //     }
    //     catch(error){
    //         //console.log(error);
    //         console.log('failure')
    //     }
    //   });
    //   stringifier.end();

    const header = 
    Array.from(allColumns).join(',') + '\n';

    const csvString = header +
    
    transformedData.map(row => {
      return row.join(',') + '\n';
    }).join('');
    
    // Write to CSV file
    // if(addHeader){
      fs.writeFile(outputFile, csvString, (err) => {
      if (err) {
          console.error('Error writing to file:', err);
      } else {
          console.log('CSV file written successfully.');
    
          // console.log('allScores (AGAIN) ===> ', allScores);
          // console.log('allTotalPrices (AGAIN) ===> ', allTotalPrices);
          // console.log('allReviewScores (AGAIN) ===> ', allReviewScores);
      }
      });
  
      console.log(`Successfully merged CSVs to ${outputFile}`);
  
    } catch (error) {
      console.error('Error merging CSVs:', error);
    }
  }

  function mergeCSVsExample(directoryPath,outputFilePath) {
    console.log('EXAMPLE: mergeCSVsExample()');
    // Example Usage:
    // const filesToMerge = [
    //   'path/to/file1.csv',
    //   'path/to/file2.csv',
    //   'path/to/file3.csv'
    // ];

    const filesToMerge = getAllFiles(directoryPath, []);
    mergeCSVs(filesToMerge, outputFilePath);
    return outputFilePath;
  }



  const NO_PRICE = -99;
  function sortAndRankTotalPrices(allTotalPrices, accomLookup) {
    const NO_VALUE = NO_PRICE;
    allTotalPrices.sort((a, b) => a.value - b.value);
    console.log('allTotalPrices ===> ', allTotalPrices);
    let currentPriceRank = 1;
    let prevPrice = NO_VALUE;
    const count = allTotalPrices.length;
    for (const [index, priceObj] of allTotalPrices.entries()) {
      const accom = accomLookup[priceObj.id];
      const hasPrevPrice = prevPrice !== NO_VALUE;
      if (hasPrevPrice) {
        if (priceObj.value !== prevPrice) {
          prevPrice = priceObj.value;
          currentPriceRank++;
          priceObj.rank = priceObj.value===0?(count+1):currentPriceRank;
        } else {
          priceObj.rank = priceObj.value===0?(count+1):currentPriceRank;
        }
      } else {
        prevPrice = priceObj.value;
        priceObj.rank = priceObj.value===0?(count+1):currentPriceRank;
      }
      accom.totalPriceRank = priceObj.rank;
    }
  }

  function sortAndRankNightlyRates(allNightlyRates, accomLookup) {
    const NO_VALUE = NO_PRICE;
    allNightlyRates.sort((a, b) => a.value - b.value);
    console.log('allNightlyRates ===> ', allNightlyRates);
    let currentPriceRank = 1;
    let prevPrice = NO_VALUE;
    for (const [index, priceObj] of allNightlyRates.entries()) {
      const accom = accomLookup[priceObj.id];
      const hasPrevPrice = prevPrice !== NO_VALUE;
      if (hasPrevPrice) {
        if (priceObj.value !== prevPrice) {
          prevPrice = priceObj.value;
          currentPriceRank++;
          priceObj.rank = currentPriceRank;
        } else {
          priceObj.rank = currentPriceRank;
        }
      } else {
        prevPrice = priceObj.value;
        priceObj.rank = currentPriceRank;
      }
      accom.nightlyRateRank = priceObj.rank;
    }
  }
  
  const NO_RATING = -135;
  function sortAndRankReviewScores(allReviewScores, accomLookup) {
    const NO_VALUE = NO_RATING;
    allReviewScores.sort((a, b) => b.value - a.value);
    console.log('allReviewScores ===> ', allReviewScores);
    let currentRatingRank = 1;
    let prevRating = NO_VALUE;
    for (const [index, ratingObj] of allReviewScores.entries()) {
      const accom = accomLookup[ratingObj.id];
      const hasPrevRating = prevRating !== NO_VALUE;
      if (hasPrevRating) {
        if (ratingObj.value !== prevRating) {
          prevRating = ratingObj.value;
          currentRatingRank++;
          ratingObj.rank = currentRatingRank;
        } else {
          ratingObj.rank = currentRatingRank;
        }
      } else {
        prevRating = ratingObj.value;
        ratingObj.rank = currentRatingRank;
      }
      accom.reviewScoreRank = ratingObj.rank;
    }
  }

  const Criteria = Object.freeze({
    PRICE: "price",
    NIGHTLY_RATE: "nightly_rate",
    REVIEW_RATING: "review",
    RARE_FIND: "rare_find",
    GUEST_FAVORITE: "guest_favorite",
    SUPERHOST: "Superhost", //
    AIR_CONDITIONING: "air_conditioning",
    WIFI: "wifi"//,
    // BEDS: "beds",
    // LOCATION: "location",
    // CITY: "city",
    // UNKNOWN:"unknown"
  });

  function getScore(accommodation, criteria, count){
    let score = 0;
    let rank = -1;
    const weight = getWeight(criteria);
    if(criteria === Criteria.RARE_FIND){
      return 0;//score = weight * (accommodation.amenities[Criteria.RARE_FIND]?.available?1:0);
    }
    else if(criteria === Criteria.GUEST_FAVORITE){
        return 0;//score = weight * (accommodation.amenities[Criteria.GUEST_FAVORITE]?.available?1:0);
    }
    else if(criteria === Criteria.SUPERHOST){
        return 0;//score = weight * (accommodation.amenities[Criteria.SUPERHOST]?.available?count:0);
    }
    else if(criteria === Criteria.AIR_CONDITIONING){
    //   const hasAC = 
    //     Object.entries(accommodation.amenities)
    //     .filter(([key, value]) => value.key ==='Air Conditioning' || value.key==='AC');    
    return 0;//   score = weight * (hasAC?1:0);
    }
    else if(criteria === Criteria.WIFI){
    //   const hasWifi = 
    //     Object.entries(accommodation.amenities)
    //     .filter(([key, value]) => value.key ==='Wifi');    
    return 0;//   score = weight * (hasWifi?1:0);
    }
    else{
      rank = getRank(criteria, accommodation, count);
      score = (count + 1 - rank) * weight;
    }
    console.log(' accommodation: ' + accommodation.id +' criteria: ' + criteria +  ' rank: ' + rank + ' weight: ' + weight +  ' score: ' + score + ' count: ' + count);
    return score < 0 ? 0 : score;
  }
  
  function getWeight(criteria) {
    switch(criteria){
      case Criteria.PRICE: 
       return 5;
      case Criteria.NIGHTLY_RATE: 
       return 5;
      case Criteria.REVIEW_RATING:
       return 5;
      case Criteria.AIR_CONDITIONING:
       return 4;
      case Criteria.WIFI:
       return 4;
      case Criteria.RARE_FIND:
        return 5;
      case Criteria.SUPERHOST:
          return 5;
      case Criteria.GUEST_FAVORITE:
        return 2;
     
      // case Criteria.BEDS:
      //  return value * count;
      // case Criteria.LOCATION:
      //  return value * count;
      // case Criteria.CITY:
      //  return value * count;
      default:
       return 0;
    }
  }
  
  // type Rank = {
  //   id: string;
  //   value: any;
  //   rank: number;
  // };
  
  // const reviewScoreRanks =[];
  // const priceRanks = [];
  
  function getRank(criteria, accommodation, count) {
    switch(criteria){
      case Criteria.REVIEW_RATING:
        return accommodation.reviewScoreRank;
      case Criteria.PRICE: 
        if(accommodation.totalPriceRank>0 || !accommodation.totalPrice){
          return accommodation.totalPriceRank;
        }
        else{
          return count + 1;
        }
      case Criteria.NIGHTLY_RATE: 
        const hasTotalPrice = accommodation.totalPriceRank>0 || !accommodation.totalPrice;
        if(hasTotalPrice){
          return count + 1;
        }
        return accommodation.nightlyRateRank;
      // case Criteria.BEDS:
      //  return value * count;
      // case Criteria.LOCATION:
      //  return value * count;
      // case Criteria.CITY:
      //  return value * count;
      default:
       return 0;
    }
  }
  
  // function getRatingRank(accommodation) {
  //   const maxRating = 5.0;
  //   const rating = parseFloatReviewScore(accommodation);
  //   const rank = maxRating - rating + 1;
  //   return rank;
  // }
  
  function parseFloatReviewScore(accommodation){
    const reviewScore = accommodation.reviewScore;
    if(reviewScore){
     //const reviewScoreAsSting = accommodation.reviewScoreAsString
      return parseFloat(reviewScore) ?? 0;// parseFloat(reviewScoreAsSting);
    }
    else{
      return 0;
    }
  }

  function tallyScores(accommodation,count){
    accommodation.subScores = {};
    const allCriteria = Object.values(Criteria);

    let summedScores = 0;;
    allCriteria.forEach((criteria) => {
    
      let score = getScore(accommodation, criteria, count);
      if(criteria !== Criteria.PRICE && criteria !== Criteria.NIGHTLY_RATE && criteria !== Criteria.REVIEW_RATING){
        score = 0;
      }
      summedScores += score;
      accommodation.totalScore = summedScores;
      accommodation.subScores[criteria] = score;
      console.log(`Total score for accomodation ${accommodation.id}: ${accommodation.totalScore} sub-scores: ${JSON.stringify(accommodation.subScores)}`);
    });
  }

  async function rescoreCSVs(files, outputFile, options = {}) {
      const defaultOptions = {
        delimiter: ',', 
        from_line: 1, 
        columns: true 
      };
      const mergedOptions = { ...defaultOptions, ...options };
  
      const allColumns = new Set();
      const allData = [];
  
      for (const file of files) {
        console.log('HEEEEELLLLLLLLOOOO: ',file);
        // try{
            const data = await new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(file)
                .pipe(parse(mergedOptions))
                .on('data', (row) => {
                Object.keys(row).forEach(col =>{
                    allColumns.add(col);
                });
                results.push(row);
                })
                .on('end', () => {
                resolve(results);
                })
                .on('error', (error) => {
                reject(error);
                });
            });
            allData.push(...data);
        // }
        // catch(error){
        //     //console.log(error);
        // }
      }
//console.log('all columns',allColumns.values());
      // Create a mapping of column names to their index
      const columnMap = {};
      allColumns.forEach((col, index) => {
        columnMap[col] = index;
      });

      const accommodations = [];
      const allTotalPrices = [];
      const allNightlyRates = [];
      const allReviewScores = [];
      const accomLookup = {};

      let dupeCount = 0;
      const transformedData = allData.map(row => {
        const newRow = {}; 
        allColumns.forEach(col => {
          newRow[col] = row[col] || null; 
        });
        if(!accomLookup[newRow.id]){
            if(newRow.nights===0 || !newRow.nights ){
                newRow.nights = 3;
                newRow.totalPrice = newRow.nightlyRateDisplay * newRow.nights;
                newRow.nightlyTotalDisplayPercent =  newRow.nightlyTotalDisplay / (newRow.totalPrice*1.0)*100
                newRow.feePercent = (newRow.airbnbFee + newRow.cleaningFee * 1.0)/(newRow.totalPrice * 1.0)*100
            }
            accommodations.push(newRow);
            accomLookup[newRow.id] = newRow;
            allTotalPrices.push({ id: newRow.id, value: newRow.totalPrice, rank: 0 });
            allNightlyRates.push({ id: newRow.id, value: newRow.nightlyRateDisplay, rank: 0 })
            allReviewScores.push({ id: newRow.id, value: parseFloatReviewScore(newRow), rank: 0 });
        }
        else{
            console.log('DUPE ' + newRow.id);
            dupeCount++;
        }
        return newRow;
      });

     



       sortAndRankTotalPrices(allTotalPrices, accomLookup);
          sortAndRankNightlyRates(allNightlyRates, accomLookup);
          sortAndRankReviewScores(allReviewScores, accomLookup);
          // Sort accommodations by review rating (descending) and then by price (ascending)
          accommodations.sort((a, b) => {
            if (a.reviewScore !== b.reviewScore) {
              return b.reviewScore - a.reviewScore;
            } else {
              return a.totalPrice - b.totalPrice;
            }
          });
      
          // Sample list of dictionaries
          // const list = [
          //   { id: 1, name: "Alice", age: 25 },
          //   { id: 2, name: "Bob", age: 30 },
          //   { id: 3, country: "USA", name: "Charlie" },
          // ];
      
          // Collect unique keys
          const uniqueKeys = new Set(); // Use a Set to store unique values
          const allScores = [];
          const count = accommodations.length;

      
          accommodations.forEach(accom => {
            // const dict = accom.amenities;
           
            // Object.values(dict).forEach(value => uniqueKeys.add(value.title));
            //setPriceRank(accom);
            // tally score
            tallyScores(accom,count);
            allScores.push({id:accom.id, score: accom.totalScore, accom:accom})
          });
      
          // sort by decreasing score - so that max score is first
          allScores.sort((a, b) => b.score - a.score);
          console.log('allScores ===> ', allScores);
          // Convert Set to Array (optional)
          const uniqueKeyArray = Array.from(uniqueKeys);
      
          console.log(uniqueKeyArray); // Output: ['id', 'name', 'age', 'country']
      
          // Calculate rank
          accommodations.map((accom) =>{
            const calcRank = allScores.findIndex((item) => item.id === accom.id) + 1;
            accom.rank = calcRank;
          });
      
          // Sort by increasing rank - so that min rank is first and max score is first
          accommodations.sort((a, b) => a.rank - b.rank);
      
          // Write to CSV file
          //const csvString = `id,title,price,rating,ratingString,url,beds,amenities\n` +
      
          //const addHeader = shouldAddHeader??false
          const header = //addHeader?
          `rank,totalRankScore,totalPriceRankScore,nightlyRateScore,reviewRankScore,rareFindScore,acScore,wifiScore,guestFavoriteScore,superhostScore,id,title,dates,totalPrice,totalPriceRank,nightlyRateRank,reviewScore,reviewScoreString,reviewScoreRank,url,nightlyRateDisplay,nights,nightlyTotalDisplay,nightlyTotalDisplayPercent,cleaningFee,airbnbFee,feeTotal,feePercent,beds,${Object.values(uniqueKeyArray).join(',')}\n`;
          //:'';
          const csvString = header +
      
          // accommodations.map((row) =>
          //     Object.values(row).join(',')
          // ).join('\n');
      
      
      
          // OUTPUTS all the listings as 1 csv row per listing
          accommodations.map((accom) =>{
            // const calcRank = allScores.findIndex((item) => item.id === accom.id) + 1;
            // accom.rank = calcRank;
            // Create csv row
            // const serializeObj = {amenities,amenityString,totalScore,subScores,id,title,rank,...rest} = accom
            // console.log('serialized obj', serializeObj);
            // console.log('...rest', rest);
            // console.log('scores:', subScores);
            //console.log(`Total Score: ${score}`);
            // let csvRow =`${rank},${totalScore},${subScores[Criteria.PRICE]},${subScores[Criteria.NIGHTLY_RATE]},${subScores[Criteria.REVIEW_RATING]},${subScores[Criteria.RARE_FIND]},${subScores[Criteria.AIR_CONDITIONING]},${subScores[Criteria.WIFI]},${subScores[Criteria.GUEST_FAVORITE]},${subScores[Criteria.SUPERHOST]}`;
            // csvRow += `,${id},${title.indexOf(',')>0?`"${title}"`:title}`;
            // csvRow += `,${Object.values(rest).join(',')}`;
            // csvRow += `,${Object.values(uniqueKeyArray).map(amenityName => amenities[amenityName]?amenities[amenityName].available:'').join(',')}`;
      
            let csvRow = `${Object.values(accom).join(',')}`;
            //csvRow += `,${Object.values(amenities).map(amenity => amenity.available? amenity.title : '').join(',')}`;
            // Object.values(row).join(',');
            return csvRow;
          }).join('\n');
      
          // Write to CSV file
          fs.writeFile(outputFile, csvString, (err) => {
          if (err) {
              console.error('Error writing to file:', outputFile, err);
          } else {
              console.log('CSV file written successfully.',outputFile);
          }
          });
      
      
          console.log(`Found ${count} accommodations total`);
          // Group accommodations by review rating
          const groupedAccommodations = {};
          for (const accommodation of accommodations) {
            const reviewScore = accommodation.reviewScore;
            const reviewScoreAsSting = accommodation.reviewScoreAsString
            const key = reviewScore ?? reviewScoreAsSting
            if (!groupedAccommodations[key]) {
              groupedAccommodations[key] = [];
            }
            groupedAccommodations[key].push(accommodation);
          }
          
          console.log('number of transformedData rows', transformedData.length);
          console.log('number of accommodations', accommodations.length);
          console.log('dupe count',dupeCount);
          return groupedAccommodations;
  }






  function rescoreCSVsExample(mergedFile,outputFilePath) {
    console.log('EXAMPLE: rescoreCSVsExample()');
    // Example Usage:
    const filesToMerge = [
      mergedFile
    //   ,
    //   'path/to/file2.csv',
    //   'path/to/file3.csv'
    ];
    // const directoryPath = 'merge'; 
    // const filesToMerge = getAllFiles(directoryPath, []);
   // const outputFilePath = `rescoredResults.csv`;
    rescoreCSVs(filesToMerge, outputFilePath);
    return outputFilePath;
  }
  const directoryPath = 'merge2'; 
  const mergedFile = `allMergedResultsMedellinDebug.csv`;
  const rescoredFile = `rescoredResultsMedellinDebug.csv`;
  //const mergedFile = 
  //mergeCSVsExample(directoryPath,mergedFile);
  //const mergedFile = 'mergedResults.csv'
rescoreCSVsExample(mergedFile,rescoredFile);