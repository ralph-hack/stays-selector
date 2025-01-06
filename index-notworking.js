const fs = require('fs');
const puppeteer = require('puppeteer');
const staggered = [5,10,30]
const checkin = '2025-01-19'
const checkout = '2025-01-22'
const dateRange = `${formatDate(checkin)} - ${formatDate(checkout)}`
const guests = '1'
const adults = '1'
const maxPrice = 100;
const priceParam = `price_max%3A${maxPrice}`
const flexibleDatesParam =`flexible_trip_lengths%5B%5D=one_week&flexible_date_search_filter_type=6`
const roomTypeParam='room_types%5B%5D=Entire%20home%2Fapt'
const findParams = `${roomTypeParam}&${priceParam}` 
const arriveLeave = `check_in=${checkin}&check_out=${checkout}`
const bookingParams = `${arriveLeave}&guests=${guests}&adults=${adults}` 
const specificQuery = `?${findParams}&${bookingParams}`
const flexibleQuery = `?${findParams}&${bookingParams}&${flexibleDatesParam}`
const looseQuery = ''
//const query = flexibleQuery
//const query = specificQuery
 const query = looseQuery
const NO_RANK = -125;

async function extractAccommodations(  

  data,
  accommodations = [],
   allTotalPrices = [],
   allNightlyRates = [],
   allReviewScores = [],
   accomLookup = {},
   //,browser
   ){

  let count = 0
  const paginationInfo = data.niobeMinimalClientData[0][1].data.presentation.staysSearch.results.paginationInfo;
  for (const result of data.niobeMinimalClientData[0][1].data.presentation.staysSearch.results.searchResults) {
    //console.log(result)
    const listing = result.listing;
    if (accomLookup[listing.id]) {
      console.log('DUPE ' + listing.id);
      continue;
    }
    const badges = result.badges;
    const pricingQuote = result.pricingQuote
    const structuredContent = listing.structuredContent;
    const beds = structuredContent.primaryLine && structuredContent.primaryLine.length>0 && structuredContent.primaryLine[0].body.indexOf('bed')>-1? structuredContent.primaryLine[0].body : null;
    const primaryLine = pricingQuote.structuredStayDisplayPrice.primaryLine
    const secondaryLine = pricingQuote.structuredStayDisplayPrice.secondaryLine
    const explanationData = pricingQuote.structuredStayDisplayPrice.explanationData
    const priceDetailItems = explanationData?.priceDetails[0].items
    const priceAsString = (primaryLine.price ?? primaryLine.discountedPrice).replace('$', '')
    const totalPriceAsString = secondaryLine?(secondaryLine.price).replace('$', '').replace(' total', ''):null

    const cleaningFee = priceDetailItems?.find((item) => 
      item.description === 'Cleaning fee'
    )
    const cleaningFeeAsFloat = cleaningFee? parseFloat(cleaningFee.priceString.replace('$', '')):0

    const airbnbFee = priceDetailItems?.find((item) =>
      item.description === 'Airbnb service fee'
    )
    const airbnbFeeAsFloat = airbnbFee? parseFloat(airbnbFee.priceString.replace('$', '')):0


    const nightlyPriceTotal = priceDetailItems?.find((item) =>
      item.description.indexOf(' nights') > -1
    )
    let nightlyPriceTotalAsFloat = 0
    let numNightsAsInt = 0
    if(nightlyPriceTotal){
      nightlyPriceTotalAsFloat = nightlyPriceTotal? parseFloat(nightlyPriceTotal.priceString.replace('$', '')):0
      const nightlyPriceDescription = nightlyPriceTotal?.description
      const startIndex = nightlyPriceDescription?.indexOf('x ')
      const numNightsAsString = nightlyPriceDescription?.substring(startIndex).replace('x ', '').replace(' nights', '').trim()
      numNightsAsInt = parseInt(numNightsAsString)
    }
    const totalPrice =  totalPriceAsString?parseFloat(totalPriceAsString.replace('$', '')):0
    const avgRatingAsString = result.avgRatingLocalized
    const avgRatingAsFloat = avgRatingAsString?parseFloat(avgRatingAsString.split()[0]):null
    const listingUrl = `https://www.airbnb.com/rooms/${listing.id}${bookingParams.length>0?`?${bookingParams}`:""}`
 
    const accommodation = {
      // Main information
      id: listing.id,
      title: listing.title,
      dates: dateRange,
      totalPrice: totalPrice,
      totalPriceRank: NO_RANK,
      nightlyRateRank: NO_RANK,
      reviewScore: isNaN(avgRatingAsFloat)?null:avgRatingAsFloat,
      reviewScoreAsString: avgRatingAsString,
      reviewScoreRank: NO_RANK,
      url: listingUrl,

      // Secondary Price breakdown information
      nightlyRateDisplay: parseFloat(priceAsString),
      //nightlyRateFloat: nightlyPriceTotalAsFloat / numNightsAsInt,
      nights: numNightsAsInt,
      nightlyTotalDisplay: nightlyPriceTotalAsFloat,
      nightlyTotalDisplayPercent:  nightlyPriceTotalAsFloat / totalPrice,
      cleaningFee:  cleaningFeeAsFloat,
      airbnbFee: airbnbFeeAsFloat,
      feeTotal: airbnbFeeAsFloat + cleaningFeeAsFloat,
      feePercent: (airbnbFeeAsFloat + cleaningFeeAsFloat)/totalPrice,
      
      // Amenities
      beds: beds,

      // Scores & Rankings
      totalScore: 0,
      subScores: {} //,
      //,
     //,

      // DEBUG
      // debug_nightlyPriceTotal: nightlyPriceTotal,
      // debug_airbnbfee: airbnbFee,
      // debug_cleaningfee: cleaningFee
    };
    if(accommodation.nightlyRateDisplay>maxPrice){
      console.log('OVERPRICED', accommodation.id, accommodation.nightlyRateDisplay, maxPrice)
      continue;
    }
    accomLookup[accommodation.id] = accommodation;
    allTotalPrices.push({ id: accommodation.id, value: accommodation.totalPrice, rank: 0 });
    allNightlyRates.push({ id: accommodation.id, value: accommodation.nightlyRateDisplay, rank: 0 })
    allReviewScores.push({ id: accommodation.id, value: parseFloatReviewScore(accommodation), rank: 0 });
    let retryCount = 0;
    let amenities = {};
    while(retryCount < 3){
      try{
          amenities = await fetchAmenitiesAndTotalPrice(listingUrl
            //,browser
          )
          break;
      }
      catch(error){
        retryCount++;
        if(retryCount>2){  
          console.error('ERROR FETCHING', listingUrl, error)
          return;
        }
        console.log('RETRYING fetchAmenitiesAndTotalPrice', listingUrl, error)
        sleep(staggered[retryCount]*1000);  
      }
    }
    for(const badge of badges){
      console.log('badge', badge)
      amenities[badge.text] = {title:badge.text, available:true};
    }
  
    accommodation.amenities = amenities;
        const amenityString = Object.entries(amenities)
  //.filter(([key, value]) => value.available)
  .map(([key, value]) => value.title)
  .join(', ');
    accommodation.amenityString = amenityString;
    console.log('accommodation ===> ',accommodation)
    accommodations.push(accommodation);
    count++;
  }
  return paginationInfo;
}

async function processAccommodations(data,city,accommodations = [],
  allTotalPrices = [],
  allNightlyRates = [],
  allReviewScores = [],
  accomLookup = {}
  //,browser
  ) {

  // const accommodations = [];
  // const allTotalPrices = [];
  // const allNightlyRates = [];
  // const allReviewScores = [];
  // const accomLookup = {};
  
  
  const paginationInfo = await extractAccommodations(  
    data,
    accommodations ,
     allTotalPrices ,
     allNightlyRates ,
     allReviewScores ,
     accomLookup
    //,browser
  );
  return {paginationInfo, accommodations};
}

function formatDate(origDateString){
  const date = new Date(origDateString);
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  const formattedDate = `${month}/${day}/${year}`;
  //console.log(formattedDate); // Output: '01-19-25'
  return formattedDate;

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

function tallyScores(accommodation,count){
  const allCriteria = Object.values(Criteria);
  allCriteria.forEach((criteria) => {
  
    let score = getScore(accommodation, criteria, count);
    if(criteria !== Criteria.PRICE && criteria !== Criteria.NIGHTLY_RATE && criteria !== Criteria.REVIEW_RATING){
      score = 0;
    }
    accommodation.totalScore += score;
    accommodation.subScores[criteria] = score;
    console.log(`Total score for accomodation ${accommodation.id}: ${accommodation.totalScore} sub-scores: ${JSON.stringify(accommodation.scores)}`);
  });
}

function getScore(accommodation, criteria, count){
  let score = 0;
  let rank = -1;
  const weight = getWeight(criteria);
  if(criteria === Criteria.RARE_FIND){
    score = weight * (accommodation.amenities[Criteria.RARE_FIND]?.available?1:0);
  }
  else if(criteria === Criteria.GUEST_FAVORITE){
    score = weight * (accommodation.amenities[Criteria.GUEST_FAVORITE]?.available?1:0);
  }
  else if(criteria === Criteria.SUPERHOST){
    score = weight * (accommodation.amenities[Criteria.SUPERHOST]?.available?count:0);
  }
  else if(criteria === Criteria.AIR_CONDITIONING){
    const hasAC = 
      Object.entries(accommodation.amenities)
      .filter(([key, value]) => value.key ==='Air Conditioning' || value.key==='AC');    
    score = weight * (hasAC?1:0);
  }
  else if(criteria === Criteria.WIFI){
    const hasWifi = 
      Object.entries(accommodation.amenities)
      .filter(([key, value]) => value.key ==='Wifi');    
    score = weight * (hasWifi?1:0);
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
// function setPriceRank(accommodation) {
//   const id = accommodation.id;
//   const price = accommodation.price;
//   let rank = NO_RANK;
//   for (const [index, priceObj] of allPrices.entries()) {
//     if (priceObj.id === id) {
//       rank = priceObj.rank;
//       break;
//     }
//   }
//   accommodation.priceRank = rank;
//   // priceRanks.push({ id, value: price, rank });
//   // const found = flightRanks.find((flightRank) => {
//   //   if (flightRank.id === id) {
//   //     flightRank.rankPrice = rank;
//   //     return true;
//   //   }
//   //   return false;
//   // });
//   // if (!found) {
//   //   flightRanks.push({
//   //     id,
//   //     rankRating: 0,
//   //     rankDayLeave: 0,
//   //     rankDayReturn: 0,
//   //     rankPrice: rank,
//   //     rankDurationLeave: 0,
//   //   });
//   // }
// }

function processAmenities(json) {
  console.log('json:', json);
  const amenities = {};
  let rareFind = false;
  const data = json.niobeMinimalClientData[0][1].data;
  console.log('data ===> ',json.niobeMinimalClientData[1],data);
  const presentation =data.presentation;
  //console.log('presentation ===> ', presentation);
  const stayProductDetailPage = data.presentation.stayProductDetailPage;
  //console.log('stayProductDetailPage ===>',stayProductDetailPage);
  const sections = stayProductDetailPage.sections.sections;
  const metadata = stayProductDetailPage.sections.metadata;
  //console.log('sections ===>',sections)
  for (const sectionContainer of sections) {
    //console.log('sectionContainer.id ===>',sectionContainer.id)
    //break;
    const section = sectionContainer.section;
    //console.log('section ===>',section)
   //console.log('section.id ===>',section?.id)
    const amenityGroups = section?.previewAmenitiesGroups? [...section.previewAmenitiesGroups]: [];
    if(section?.seeAllAmenitiesGroups) {
      amenityGroups.concat(section?.seeAllAmenitiesGroups);
    }
    if(section?.messageData){
      const message = section?.messageData.message;
      console.log('message ====>', message)
      rareFind = message.headline?.indexOf('rare find')>-1;
      amenities['sectioMessageData'] = message.headline;
    }
    if(!rareFind && metadata?.bookingPrefetchData?.p3MessageData){
      const message = metadata?.bookingPrefetchData?.p3MessageData?.messageData.message;
      console.log('bookingPrefetchData ====>', message)
      rareFind = message.headline?.indexOf('rare find')>-1;
      amenities['bookingPrefetchData'] = message.headline;
    }
    if(rareFind){
      amenities[Criteria.RARE_FIND] = {title:Criteria.RARE_FIND,available:rareFind};
    }

    if(section?.heading?.title === 'Guest favorite'){
      amenities[Criteria.GUEST_FAVORITE] = {title:Criteria.GUEST_FAVORITE,available:true};
    }

    //console.log('amenityGroups ===> ',amenityGroups)
    for (const amenityGroup of amenityGroups) {
      for (const amenity of amenityGroup.amenities) {
          amenities[amenity.title] = {
            title: amenity.title,
            available: amenity.available
          }

          console.log('amenity ===> ', amenities[amenity.title])
      }
    }
  }

  return amenities;
}

async function fetchAmenitiesAndTotalPrice(url
  // ,browser
) {
  const browser = await puppeteer.launch({
    ignoreCertificateErrors: true, // Bypass certificate verification
  });
  const page = await browser.newPage();
  console.log('Going to url: ', url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const textContent = await page.evaluate(() => {
    try{
      const dynamicContentElement = document.getElementById('data-deferred-state-0');
      return dynamicContentElement.textContent;
    } catch (error) {
      console.error('Amenities Error:', error);
      return null;
    }
  });
  // await browser.close();
  
  //console.log('page data content', textContent);
  
  //const htmlContent = await page.content();
  // fs.writeFile('data.txt', textContent, (err) => {
  //   if (err) {
  //     console.error('Error writing file:', err);
  //   } else {
  //     console.log('HTML content saved to data.txt');
  //   }
  // });
  
  if(!textContent) return {};
  const json = JSON.parse(textContent);
  const amenities = processAmenities(json);
  
  console.log('amenities ===> ', amenities)
  
  // const groupedData = processAccommodations(json);
  
  //     // Print the grouped data (optional)
  //     for (const score in groupedData) {
  //       console.log(`Review Score: ${score}`);
  //       for (const accommodation of groupedData[score]) {
  //         console.log(`\t- ${accommodation.title}: $${accommodation.price} ${accommodation.url}`);
  //       }
  //     }
  
  
    return amenities;
  }

  async function fetchAccommodations(city
  //  ,browser
  ) {
    const url = `https://www.airbnb.com/s/${city}--Colombia/homes${query}`;
    const browser = await puppeteer.launch({
      ignoreCertificateErrors: true, // Bypass certificate verification
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Inject the extractAmenities function into the page context
  //await page.exposeFunction('extractAmenities', extractAmenities);
  
  // const htmlContent = await page.content();
  // fs.writeFile('page.html', htmlContent, (err) => {
  //   if (err) {
  //     console.error('Error writing file:', err);
  //   } else {
  //     console.log('HTML content saved to page.html');
  //   }
  // });
  
  //   const links = await page.evaluate(()  => {
  //    //return Array.from(document.querySelectorAll('a')).map((anchor) => anchor.href)
  //    //return Array.from(document.querySelectorAll('div')).map(el => el.innerHTML.trim());
  
  //      // return Array.from(document.querySelectorAll('div.plmw1e5')).map(el => el.innerHTML.trim());
  // //      const output2 = JSON.stringify(amenities.debug); //amenitiesDiv.querySelectorAll('._19xnuo97 div:first-child')
  // // // Write the debug to a file
  // // const fileName2 = 'dom.html';
  // // console.log(typeof output2);
  // // fs.writeFile(fileName2, output2, (err) => {
  // //     if (err) {
  // //         console.error('Error writing to file:', err);
  // //     } else {
  // //         console.log(`Extracted amenities saved to ${fileName}`);
  // //     }
  // // });
  
  //   // return Array.from(document.querySelectorAll('div._1a6d9c4')).map(el => el.innerHTML.trim());
  // //    const sections = Array.from(document.querySelectorAll('div._1a6d9c4'))
  // // const amenitiesDivs = sections.map(section => section.querySelector('[data-plugin-in-point-id="AMENITIES_DEFAULT"]'));
  // // return amenitiesDivs;
  //    //return document.querySelector('[data-plugin-in-point-id="AMENITIES_DEFAULT"]');
  //   //  const amenitiesDiv = document.querySelector('[data-plugin-in-point-id="AMENITIES_DEFAULT"]');
  
  
  //   // function extractAmenities(amenitiesDiv) {
  
  //   //   if (!amenitiesDiv) return [];
  
  //   //   const amenities = Array.from(amenitiesDiv.querySelectorAll('._19xnuo97 div:first-child')).map(el => el.textContent.trim());
  
  
  
  //   //   // Remove duplicates while preserving order
  //   //   return [...new Set(amenities)];
      
  //   // }
  //   //   return extractAmenities(amenitiesDiv);
  // });
  
  // const textContent = await page.evaluate(() => {
  //   const dynamicContentElement = document.getElementById('data-deferred-state-0');
  //   return dynamicContentElement.textContent;
  // });

  
  // console.log('page data content', textContent);
  
  // //const htmlContent = await page.content();
  // fs.writeFile('data.txt', textContent, (err) => {
  //   if (err) {
  //     console.error('Error writing file:', err);
  //   } else {
  //     console.log('HTML content saved to data.txt');
  //   }
  // });
  
  //const json = JSON.parse(textContent);
  // const amenities = processAmenities(json);
  
  // console.log('amenities ===> ', amenities)
  
  // const groupedData = processAccommodations(json);
  
  //     // Print the grouped data (optional)
  //     for (const score in groupedData) {
  //       console.log(`Review Score: ${score}`);
  //       for (const accommodation of groupedData[score]) {
  //         console.log(`\t- ${accommodation.title}: $${accommodation.price} ${accommodation.url}`);
  //       }
  //     }
  

  // const textContent = await page.evaluate(() => {
  //   const dynamicContentElement = document.getElementById('data-deferred-state-0');
  //   return dynamicContentElement.textContent;
  // });
  // const json = JSON.parse(textContent);
  // const groupData = await processAccommodations(json,city)
  const groupData = {};
    const accommodations = [];
  const allTotalPrices = [];
  const allNightlyRates = [];
  const allReviewScores = [];
  const accomLookup = {};
  await navigateAndFindNextPage(city,page, url, accommodations ,
    allTotalPrices ,
    allNightlyRates ,
    allReviewScores ,
    accomLookup
  //,browser
  );

  // // Get the anchor tag with aria-label="Next page"
  // const nextPageLink = await page.$('a[aria-label="Next page"]'); 

  // if (nextPageLink) {
  //   const href = await nextPageLink.getProperty('href');
  //   const nextPageUrl = await href.jsonValue();
  //   console.log('Next Page URL:', nextPageUrl); 
  // } else {
  //   console.log('No "Next page" link found.');
  // }

  console.log('DEBUG ========> ACCUMULATED ALL ACCOMMODATIONS!!!')
    await browser.close();
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
  const dict = accom.amenities;
  Object.values(dict).forEach(value => uniqueKeys.add(value.title));
  //setPriceRank(accom);
  // tally score
  tallyScores(accom,count);
  allScores.push({id:accom.id, score: accom.totalScore})
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
  const serializeObj = {amenities,amenityString,totalScore,subScores,id,title,rank,...rest} = accom
  console.log('serialized obj', serializeObj);
  console.log('...rest', rest);
  console.log('scores:', subScores);
  //console.log(`Total Score: ${score}`);
  let csvRow =`${rank},${totalScore},${subScores[Criteria.PRICE]},${subScores[Criteria.NIGHTLY_RATE]},${subScores[Criteria.REVIEW_RATING]},${subScores[Criteria.RARE_FIND]},${subScores[Criteria.AIR_CONDITIONING]},${subScores[Criteria.WIFI]},${subScores[Criteria.GUEST_FAVORITE]},${subScores[Criteria.SUPERHOST]}`;
  csvRow += `,${id},${title.indexOf(',')>0?`"${title}"`:title}`;
  csvRow += `,${Object.values(rest).join(',')}`;
  csvRow += `,${Object.values(uniqueKeyArray).map(amenityName => amenities[amenityName]?amenities[amenityName].available:'').join(',')}`;

  //csvRow += `,${Object.values(amenities).map(amenity => amenity.available? amenity.title : '').join(',')}`;
  // Object.values(row).join(',');
  return csvRow;
}).join('\n');

// Write to CSV file
const filePath = `${city}searchResults.csv`;
// if(addHeader){
  fs.writeFile(filePath, csvString, (err) => {
  if (err) {
      console.error('Error writing to file:', err);
  } else {
      console.log('CSV file written successfully.');

      // console.log('allScores (AGAIN) ===> ', allScores);
      // console.log('allTotalPrices (AGAIN) ===> ', allTotalPrices);
      // console.log('allReviewScores (AGAIN) ===> ', allReviewScores);
  }
  });
// }
// else{
//   console.log('Appending to file');
//   fs.appendFile(filePath, `\n${csvString}`, (err) => {
//     if (err) throw err;
//     console.log('Data appended to CSV file successfully!');
//   });
// }

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

  return groupedAccommodations;
    //return groupData;
  }

  async function navigateAndFindNextPage(city,page, currentUrl, accommodations ,
    allTotalPrices ,
    allNightlyRates ,
    allReviewScores ,
    accomLookup
    //,browser
  ) {
      const html = await page.content();
    const scrape = await page.evaluate(() => {
      const dynamicContentElement = document.getElementById('data-deferred-state-0');

       // Find the "Next page" link
       //const nextPageLink = await page.$('a[aria-label="Next page"]');
      

       try{
        return {textContent: dynamicContentElement.textContent};
        // , nextPageLink: nextPageLink
      } catch (error) {
        console.error('Accommodations Error:', error);
        return null;
      }
      
    });

      // // Use a selector to find the anchor tag with aria-label set to 'Next page'
      // const nextPageHandle = await page.$("a[aria-label='Next page']");
      // let href = null;
      // if (nextPageHandle) {
      //   // Get the href attribute of the anchor tag (if needed)
      //    href = await page.evaluate(el => el.href, nextPageHandle);
      //   console.log('Href of next page:', href);
    
      //   // Optionally click the link
      //   //await nextPageHandle.click();
      // } else {
      //   console.log('Anchor tag with aria-label="Next page" not found.');
      // }

    if(!scrape) return ;
    const textContent = scrape.textContent;
    const json = JSON.parse(textContent);
    const batch = await processAccommodations(json,city,accommodations ,
      allTotalPrices ,
      allNightlyRates ,
      allReviewScores ,
      accomLookup
    //,browser
    )



      //const nextPageLink = scrape.nextPageLink;
      const pagination = batch.paginationInfo;
      const nextPageCursor = pagination?.nextPageCursor;
      console.log('pagination:',pagination)
      // const nextPageLink = href;
      try {
       
  
        //return 
       // document.querySelector('a[aria-label="Next page"]');
        //?.href;
    
        //if (nextPageLink) {
        if(nextPageCursor) {
          // console.log('DEBUG ========> NEXT PAGE LINK FOUND ')
          // const href = await nextPageLink.getProperty('href');
          // //const href = nextPageLink.href;
          // const nextPageUrl = await href.jsonValue();
          let nextPageUrl = currentUrl;
          if(nextPageUrl.indexOf('?')>-1){
            nextPageUrl += '&';
          }
          else{
            nextPageUrl += '?';
          }
          nextPageUrl += 'cursor='+nextPageCursor;
          if (nextPageUrl !== currentUrl) { // Prevent infinite loops
            console.log('DEBUG ========> RECURSION ')
            console.log('Visiting next page:', nextPageUrl);
            await sleep(1000);
            
            await page.goto(nextPageUrl, { waitUntil: 'domcontentloaded' });
            
            
            // const newBrowser = await puppeteer.launch();
            // const page = await newBrowser.newPage();
            // await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            
            
            await navigateAndFindNextPage(city,page, currentUrl,accommodations ,
              allTotalPrices ,
              allNightlyRates ,
              allReviewScores ,
              accomLookup
              //, browser
            ); // Recursive call
          } else {
            console.log('DEBUG ========> REPEAT NEXT PAGE LINK FOUND => EXIT ')
            console.log('No new "Next page" link found.');
          }
        } else {
          console.log('DEBUG ========> NO NEXT PAGE LINK FOUND ')
          console.log('No "Next page" link found.');
          //console.log('html',html)

          // Write the HTML content to a text file
          const filePath = 'page-content.html';
          //await fs.writeFile(filePath, html, 'utf-8');
          fs.writeFile(filePath, html, (err) => {
            if (err) {
              console.error('Error writing file:', err);
            } else {
              console.log(`HTML content saved to ${filePath}`);
            }
          });

        }
      } catch (error) {
        console.error('Error navigating:', error);
      }  
    
  }
  
 // fetchAccommodations('https://www.airbnb.com/rooms/1266960606459701631').then((links) => console.log('All Links:', links));
  function mainOld() {
// Load the JSON data
const city = "colombiacustom1";
fs.readFile(`${city}.json`, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading JSON file:', err);
    return;
  }

  try {
    const json = JSON.parse(data);
    processAccommodations(json,city).then((groupedData) => {

    // Print the grouped data (optional)
    for (const score in groupedData) {
      console.log(`Review Score: ${score}`);
      for (const accommodation of groupedData[score]) {
        console.log(`\t- ${accommodation.title}: $${accommodation.price} ${accommodation.url} Rank: ${accommodation.rank} Score:${accommodation.score}`);
      }
    }

    console.log(`${city}.json file processing completed.`);
  });
  } catch (error) {
    console.error('Error processing JSON data:', error);
  }

  

//   console.log('==================================')
//   console.log('Getting amenities')

//   fs.readFile(`amenities.json`, 'utf8', (err, data) => {
//     if (err) {
//       console.error('Error reading JSON file:', err);
//       return;
//     }

//     try {
//       const json = JSON.parse(data);
//       const amenities = processAmenities(json);

//       console.log('amenities ===> ', amenities)
//     } catch (error) {
//       console.error('Error processing JSON data:', error);
//     }
//   });
// });
}
);
  }

  function main() {
    //const city = "El-Poblado";
    //const city = "Laureles"; 

    // NOT DONE YET!!!!
    // const city = "San Gil";
    //const city = "Bucaramanga";
    //const city = "Ibague";
    //const city = "Rionegro";
    // const city = "Finlandia";
    // const city = "Monserrate"
    // const city = "Barinas";
    // const city = "Caracas";
    // const city = "Maracaibo";
    // const city = "Valencia";
    // cost city = "Tolu";
    // const city = "Covenas";
    //const city = "Rioacha";
    //const city = "Pereira";
    // const city = "Bogota";
    // const city = "Bucaramanga";
    // const city = "Barranquilla";
    // const city = "Cucuta";
    // const city = "Ibague";
    // const city = "Medellin";
    // const city = "Cali";
    // const city = "Barranca";
    // const city = "Santa Fe de Bogotá";
    // const city = "Tunja";
    // const city = "Cartagena";
    // const city = "Buenaventura";
    // const city = "Pereira";
    // const city = "Cayambe";
    // const city = "Santa Rosa de Cabal";
    // const city = "San José del Guaviare";
    // const city = "San Juan de Pasto";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Santa Fe de Bogotá";
    // const city = "Neiva";
    // const city = "Villavicencio";
    // const city = "Armenia";
    // const city = "Pereira";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Santa Marta";
    // const city = "Bucaramanga";
    // const city = "San José de Cúcuta";
    // const city = "Tunja";
    // const city = "Barranquilla";
    // const city = "Santa Marta";
    // const city = "Bucaramanga";
    // const city = "San José de Cúcuta";
    // const city = "Armenia";
    // const city = "Quibdó";
    // const city = "Pereira";
    // const city = "San José de Cúcuta";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Valledupar";
    // const city = "Sabaneta";
    // const city = "Ricaurte";
    // const city = "Girardot";
    // const city = "Melgar";
    // const city = "Puerto Carreño";
    // const city = "Puerto Colombia";
    // const city = "San Juan de Pasto";
    // const city = "Neiva";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Manizales";
    // const city = "Sincelejo";
    // const city = "Montería";
    // const city = "Necochea";
    // const city = "San Francisco";
    // const city = "San Andrés";
    // const city = "Bello";
    // const city = "Bogotá";
    // const city = "Santa Marta";
    // const city = "Bucaramanga";
    // const city = "Soledad";
    // const city = "Tunja";
    // const city = "Cúcuta";
    // const city = "Barranquilla";
    // const city = "Santa Marta";
    // const city = "Bucaramanga";
    // const city = "Soledad";
    // const city = "Tunja";
    // const city = "Cúcuta";
    // const city = "Barranquilla";
    // const city = "Santa Marta";
    // const city = "Bucaramanga";
    // const city = "Soledad";
    // const city = "Armenia";
    // const city = "Quibdó";
    // const city = "Pereira";
    // const city = "San José de Cúcuta";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Valledupar";
    // const city = "Sabaneta";
    // const city = "Ricaurte";
    // const city = "Girardot";
    // const city = "Melgar";
    // const city = "Cali";
    // const city = "Popoyan";
    // const city = "Cartagena";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Valledupar";
    // const city = "Sabaneta";
    // const city = "Ricaurte";
    // const city = "Girardot";
    // const city = "Melgar";
    // const city = "Cali";
    // const city = "Popoyan";
    // const city = "Cartagena";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Valledupar";
    // const city = "Sabaneta";
    // const city = "Ricaurte";
    // const city = "Girardot";
    // const city = "Melgar";
    // const city = "Cali";
    // const city = "Popoyan";
    // const city = "Pitalito";
    // const city = "San José de Costa Rica";
    // const city = "Tuluá";
    // const city = "San Andrés";
    // const city = "Neiva";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Valledupar";
    // const city = "Sabaneta";
    // const city = "Ricaurte";
    // const city = "Girardot";
    // const city = "Melgar";
    // const city = "Cali";
    // const city = "Popoyan";
    // const city = "Cartagena";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Valledupar";
    // const city = "Sabaneta";
    // const city = "Ricaurte";
    // const city = "Girardot";
    // const city = "Melgar";
    // const city = "Cali";
    // const city = "Popoyan";
    // const city = "Cartagena";
    // const city = "Santa Marta";
    // const city = "Barranquilla";
    // const city = "Valledupar";
    // const city = "Sabaneta";
    // const city = "Ricaurte";
    // const city = "Girardot";
    // const city = "Melgar";
    // const city = "Cali";
    // const city = "Popoyan";
    //  Sabaneta, Ricaurte, Girardot, Melgar, Cali, Popoyan, Cartagena, Santa Marta, Barranquilla, Valledupar
      try {
        
  
          //  console.log(`Processing ${city} started.`);
          //   fetchAccommodations(city).then((groupedData) => {

          //   // Print the grouped data (optional)
          //   for (const score in groupedData) {
          //     console.log(`Review Score: ${score}`);
          //     for (const accommodation of groupedData[score]) {
          //       console.log(`\t- ${accommodation.title}: $${accommodation.price} ${accommodation.url}  Rank: ${accommodation.rank} Score:${accommodation.totalScore}`);
          //     }
          //   }

          //   console.log(`Processing ${city} completed.`);

          
          // });
    


        const cities = readAndPrintCities();
        processCities(cities);
      
        
      } catch (error) {
        console.error('Error processing JSON data:', error);
      }

     
  }

  async function processCities(cities){
    // const browser = await puppeteer.launch({
    //   ignoreCertificateErrors: true, // Bypass certificate verification
    // });
    for(const city of cities)  {
      console.log(`Processing ${city} started.`);
        const groupedData = await fetchAccommodations(city
          //,browser
        )

        // Print the grouped data (optional)
        for (const score in groupedData) {
          console.log(`Review Score: ${score}`);
          for (const accommodation of groupedData[score]) {
            console.log(`\t- ${accommodation.title}: $${accommodation.totalPrice} ${accommodation.url}  Rank: ${accommodation.rank} Score:${accommodation.totalScore}`);
          }
        }

        console.log(`Processing ${city} completed.`);

        await sleep(1000); // Pause for 1 second before the next iteration
      
    };
    // await browser.close();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



// Function to read and print cities
function readAndPrintCities() {
    // Specify the file path

    const data = fs.readFileSync('continue.txt', 'utf8'); // Synchronous file read
        return data
            .split('\n')             // Split by new lines
            .map(city => city.trim()) // Remove extra spaces
            .filter(city => city !== ''); // Filter out empty lines
}

  main();

// function processAmenities(json) {
//   const amenities = {};
//   const data = json.data;
//   //console.log('data ===> ',data);
//   const presentation =data.presentation;
//   //console.log('presentation ===> ', presentation);
//   const stayProductDetailPage = data.presentation.stayProductDetailPage;
//   //console.log('stayProductDetailPage ===>',stayProductDetailPage);
//   const sections = stayProductDetailPage.sections.sections;
//   //console.log('sections ===>',sections)
//   for (const sectionContainer of sections) {
//     //console.log('sectionContainer.id ===>',sectionContainer.id)
//     //break;
//     const section = sectionContainer.section;
//     //console.log('section ===>',section)
//    //console.log('section.id ===>',section?.id)
//     const amenityGroups = section?.previewAmenitiesGroups? [...section.previewAmenitiesGroups]: [];
//     if(section?.seeAllAmenitiesGroups) {
//       amenityGroups.concat(section?.seeAllAmenitiesGroups);
//     }
//     //console.log('amenityGroups ===> ',amenityGroups)
//     for (const amenityGroup of amenityGroups) {
//       for (const amenity of amenityGroup.amenities) {
//           amenities[amenity.title] = {
//             title: amenity.title,
//             available: amenity.available
//           }

//           console.log('amenity ===> ', amenities[amenity.title])
//       }
//     }
//   }

//   return amenities;
// }

