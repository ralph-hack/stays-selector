const puppeteer = require('puppeteer');
const { parseFromString } = require('dom-parser');

async function getDOM(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  // Wait for the page to load completely (adjust the selector as needed)
  await page.waitForSelector('body');

  // Get the entire HTML content
  const htmlContent = await page.content();

  // You can parse the HTML content using a DOM parser like DOMParser
//   const parser = new DOMParser();
  const doc = //parser.
  parseFromString(htmlContent, 'text/html');

  console.log('doc', doc);
  // Now you can access the DOM elements using JavaScript's DOM API
  //const title = doc.getElementsByTagName('title');
 // const links = doc.getElementsByTagName('a');

  //console.log('titles found ===>', title);
  //console.log('links found ===>', links);

  // ... other DOM manipulations ...

  await browser.close();

  return doc;
}

// Example usage
getDOM('https://www.airbnb.com/rooms/1266960606459701631')
  .then(dom => {
    console.log(dom);
  })
  .catch(error => {
    console.error(error);
  });