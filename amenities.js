const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  // Launch Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

//   // Load the local HTML file
//   const filePath = path.resolve(__dirname, 'page.html');
//   const htmlContent = fs.readFileSync(filePath, 'utf8');
//   await page.setContent(htmlContent);
 const url = 'https://www.airbnb.com/rooms/1243633354792043666?check_in=2025-01-19&guests=1&adults=1&check_out=2025-01-22'
 await page.goto(url, { waitUntil: 'domcontentloaded' });

//   // Extract amenities
//   const amenities = await page.evaluate(() => {
//     const amenitiesDiv = document.querySelector('[data-plugin-in-point-id="AMENITIES_DEFAULT"]');
//     if (!amenitiesDiv) return [];

//     const amenities = Array.from(amenitiesDiv.querySelectorAll('._19xnuo97 div:first-child')).map(el => el.textContent.trim());



//     // Remove duplicates while preserving order
// const uniqueAmenities = [...new Set(amenities)];
//     return { uniqueAmenities: uniqueAmenities, debug: amenitiesDiv.querySelectorAll('._19xnuo97 div:first-child') };
//   });



    // Close the browser
    // await browser.close();

//   console.log('Extracted Amenities:', amenities);

//   // Remove duplicates while preserving order
// const uniqueAmenities = [...new Set(amenities.uniqueAmenities)];

// // Convert amenities array to a formatted string
// const output = uniqueAmenities.join('\n');

// // Write the output to a file
// const fileName = 'amenities.txt';
// fs.writeFile(fileName, output, (err) => {
//     if (err) {
//         console.error('Error writing to file:', err);
//     } else {
//         console.log(`Extracted amenities saved to ${fileName}`);
//     }
// });

// const output2 = JSON.stringify(amenities.debug); //amenitiesDiv.querySelectorAll('._19xnuo97 div:first-child')
// // Write the debug to a file
// const fileName2 = 'debug.txt';
// console.log(typeof output2);
// fs.writeFile(fileName2, output2, (err) => {
//     if (err) {
//         console.error('Error writing to file:', err);
//     } else {
//         console.log(`Extracted amenities saved to ${fileName}`);
//     }
// });



const textContent = await page.evaluate(() => {
    const dynamicContentElement = document.getElementById('data-deferred-state-0');
    return dynamicContentElement.textContent;
  });

  const htmlContent = await page.content();

  await browser.close();

  const json = JSON.parse(textContent);
  const amenities = processAmenities(json);
  
  console.log('amenities ===> ', amenities)

  const debugFile = 'debug-page.html';
  fs.writeFile(debugFile, htmlContent, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`HTML content saved to ${debugFile}`);
    }

});

})();



function processAmenities(json) {
    //console.log('json:', json);
    const amenities = {};
    let rareFind = false;
    const data = json.niobeMinimalClientData[0][1].data;
    //console.log('data ===> ',json.niobeMinimalClientData[1],data);
    const presentation =data.presentation;
    //console.log('presentation ===> ', presentation);
    const stayProductDetailPage = data.presentation.stayProductDetailPage;
    //console.log('stayProductDetailPage ===>',stayProductDetailPage);
    const sections = stayProductDetailPage.sections.sections;
    const metadata = stayProductDetailPage.sections.metadata;
    console.log('metadata ===> ', metadata);
    //console.log('sections ===>',sections)
    for (const sectionContainer of sections) {
      
      //break;
      const section = sectionContainer.section;
      console.log('sectionContainer.id ===>',sectionContainer.id, sectionContainer.sectionId);
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