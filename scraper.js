const puppeteer = require('puppeteer');
const fs = require('fs');
//const { extractAmenities } = require('./extractAmenities.js');


async function fetchAllLinks(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
// Inject the extractAmenities function into the page context
//await page.exposeFunction('extractAmenities', extractAmenities);

const htmlContent = await page.content();
fs.writeFile('page.html', htmlContent, (err) => {
  if (err) {
    console.error('Error writing file:', err);
  } else {
    console.log('HTML content saved to page.html');
  }
});

  const links = await page.evaluate(()  => {
   //return Array.from(document.querySelectorAll('a')).map((anchor) => anchor.href)
   //return Array.from(document.querySelectorAll('div')).map(el => el.innerHTML.trim());

     // return Array.from(document.querySelectorAll('div.plmw1e5')).map(el => el.innerHTML.trim());
//      const output2 = JSON.stringify(amenities.debug); //amenitiesDiv.querySelectorAll('._19xnuo97 div:first-child')
// // Write the debug to a file
// const fileName2 = 'dom.html';
// console.log(typeof output2);
// fs.writeFile(fileName2, output2, (err) => {
//     if (err) {
//         console.error('Error writing to file:', err);
//     } else {
//         console.log(`Extracted amenities saved to ${fileName}`);
//     }
// });

  // return Array.from(document.querySelectorAll('div._1a6d9c4')).map(el => el.innerHTML.trim());
//    const sections = Array.from(document.querySelectorAll('div._1a6d9c4'))
// const amenitiesDivs = sections.map(section => section.querySelector('[data-plugin-in-point-id="AMENITIES_DEFAULT"]'));
// return amenitiesDivs;
   //return document.querySelector('[data-plugin-in-point-id="AMENITIES_DEFAULT"]');
  //  const amenitiesDiv = document.querySelector('[data-plugin-in-point-id="AMENITIES_DEFAULT"]');


  // function extractAmenities(amenitiesDiv) {

  //   if (!amenitiesDiv) return [];

  //   const amenities = Array.from(amenitiesDiv.querySelectorAll('._19xnuo97 div:first-child')).map(el => el.textContent.trim());



  //   // Remove duplicates while preserving order
  //   return [...new Set(amenities)];
    
  // }
  //   return extractAmenities(amenitiesDiv);
});

const textContent = await page.evaluate(() => {
  const dynamicContentElement = document.getElementById('data-deferred-state-0');
  return dynamicContentElement.textContent;
});
await browser.close();

console.log('page data content', textContent);

//const htmlContent = await page.content();
fs.writeFile('data.txt', textContent, (err) => {
  if (err) {
    console.error('Error writing file:', err);
  } else {
    console.log('HTML content saved to data.txt');
  }
});

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


  return links;
}

fetchAllLinks('https://www.airbnb.com/rooms/1266960606459701631').then((links) => console.log('All Links:', links));

function processAmenities(json) {
  console.log('json:', json);
  const amenities = {};
  const data = json.niobeMinimalClientData[0][1].data;
  console.log('data ===> ',json.niobeMinimalClientData[1],data);
  const presentation =data.presentation;
  //console.log('presentation ===> ', presentation);
  const stayProductDetailPage = data.presentation.stayProductDetailPage;
  //console.log('stayProductDetailPage ===>',stayProductDetailPage);
  const sections = stayProductDetailPage.sections.sections;
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


function processAccommodations(data) {
  const accommodations = [];
  for (const result of data.niobeMinimalClientData[0][1].data.presentation.staysSearch.results.searchResults) {
    //console.log(result)
    const listing = result.listing;
    const pricingQuote = result.pricingQuote
    const structuredContent = listing.structuredContent;
    const beds = structuredContent.primaryLine && structuredContent.primaryLine.length>0 && structuredContent.primaryLine[0].body.indexOf('bed')>-1? structuredContent.primaryLine[0].body : null;
    const primaryLine = pricingQuote.structuredStayDisplayPrice.primaryLine
    const priceAsString = (primaryLine.price ?? primaryLine.discountedPrice).replace('$', '')
    const avgRatingAsString = result.avgRatingLocalized
    const avgRatingAsFloat = avgRatingAsString?parseFloat(avgRatingAsString.split()[0]):null
    const listingUrl = `https://www.airbnb.com/rooms/${listing.id}`
    const accommodation = {
      id: listing.id,
      title: listing.title,
      price: parseFloat(priceAsString),
      reviewRating: isNaN(avgRatingAsFloat)?null:avgRatingAsFloat,
      reviewRatingAsString: avgRatingAsString,
      url: listingUrl,
      beds: beds
    };
    console.log('accommodation ===> ',accommodation)
    accommodations.push(accommodation);
  }

  // Sort accommodations by review rating (descending) and then by price (ascending)
  accommodations.sort((a, b) => {
    if (a.reviewRating !== b.reviewRating) {
      return b.reviewRating - a.reviewRating;
    } else {
      return a.price - b.price;
    }
  });

  // Group accommodations by review rating
  const groupedAccommodations = {};
  for (const accommodation of accommodations) {
    const reviewRating = accommodation.reviewRating;
    const reviewRatingAsSting = accommodation.reviewRatingAsString
    const key = reviewRating ?? reviewRatingAsSting
    if (!groupedAccommodations[key]) {
      groupedAccommodations[key] = [];
    }
    groupedAccommodations[key].push(accommodation);
  }

  return groupedAccommodations;
}