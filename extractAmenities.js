// extractAmenities.js
function extractAmenities(amenitiesDiv) {

    if (!amenitiesDiv) return [];

    const amenities = Array.from(amenitiesDiv.querySelectorAll('._19xnuo97 div:first-child')).map(el => el.textContent.trim());



    // Remove duplicates while preserving order
    return [...new Set(amenities)];
    
  }
  
  // Export the function to be used in other files
  module.exports = { extractAmenities };
  