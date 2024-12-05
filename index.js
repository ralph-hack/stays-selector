const fs = require('fs');

function processAccommodations(data) {
  const accommodations = [];
  for (const result of data.niobeMinimalClientData[0][1].data.presentation.staysSearch.results.searchResults) {
    //console.log(result)
    const listing = result.listing;
    const pricingQuote = result.pricingQuote
    const primaryLine = pricingQuote.structuredStayDisplayPrice.primaryLine
    const priceAsString = (primaryLine.price ?? primaryLine.discountedPrice).replace('$', '')
    const avgRatingAsString = result.avgRatingLocalized
    const avgRatingAsFloat = parseFloat(avgRatingAsString.split()[0])
    const listingUrl = `https://www.airbnb.com/rooms/${listing.id}`
    const accommodation = {
      title: listing.title,
      price: parseFloat(priceAsString),
      reviewRating: isNaN(avgRatingAsFloat)?null:avgRatingAsFloat,
      reviewRatingAsString: avgRatingAsString,
      url: listingUrl
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

// Load the JSON data
fs.readFile('accommodations.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading JSON file:', err);
    return;
  }

  try {
    const json = JSON.parse(data);
    const groupedData = processAccommodations(json);

    // Print the grouped data (optional)
    for (const score in groupedData) {
      console.log(`Review Score: ${score}`);
      for (const accommodation of groupedData[score]) {
        console.log(`\t- ${accommodation.title}: $${accommodation.price} ${accommodation.url}`);
      }
    }
  } catch (error) {
    console.error('Error processing JSON data:', error);
  }
});
