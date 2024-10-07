// utils.js

// --------------------------------------------
// Existing Utility Functions
// --------------------------------------------

/**
 * Calculate the Haversine distance between two geographic coordinates.
 * @param {number} lat1 - Latitude of the first location.
 * @param {number} lon1 - Longitude of the first location.
 * @param {number} lat2 - Latitude of the second location.
 * @param {number} lon2 - Longitude of the second location.
 * @returns {number} - Distance in kilometers.
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
};

/**
 * Calculate the median of an array of numbers.
 * @param {number[]} arr - Array of numbers.
 * @returns {number|null} - Median value or null if array is empty.
 */
export const calculateMedian = (arr) => {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Calculate the lower and upper quartiles of an array of numbers.
 * @param {number[]} arr - Array of numbers.
 * @returns {Object} - Object containing lowerQuartile and upperQuartile.
 */
export const calculateConfidenceBands = (arr) => {
  if (!arr.length) return { lowerQuartile: null, upperQuartile: null };
  const sorted = [...arr].sort((a, b) => a - b);
  const lowerIndex = Math.floor(sorted.length * 0.25);
  const upperIndex = Math.floor(sorted.length * 0.75);
  return {
    lowerQuartile: sorted[lowerIndex],
    upperQuartile: sorted[upperIndex],
  };
};

// --------------------------------------------
// Classification Functions
// --------------------------------------------

/**
 * Classify the number of beds into categories.
 * @param {number} beds - Number of bedrooms.
 * @returns {string} - 'small', 'medium', or 'large'.
 */
export const classifyBeds = (beds) => {
  if (beds <= 2) return 'small';
  if (beds <= 4) return 'medium';
  return 'large';
};

/**
 * Classify the number of baths into categories.
 * @param {number} baths - Number of bathrooms.
 * @returns {string} - 'small', 'medium', or 'large'.
 */
export const classifyBaths = (baths) => {
  if (baths <= 1) return 'small';
  if (baths <= 2) return 'medium';
  return 'large';
};

/**
 * Classify the size of the property into categories.
 * @param {number} size - Size of the property in square meters.
 * @returns {string} - 'small', 'medium', or 'large'.
 */
export const classifySize = (size) => {
  if (size <= 100) return 'small';
  if (size <= 200) return 'medium';
  return 'large';
};

// --------------------------------------------
// Composite Classification
// --------------------------------------------

/**
 * Get the composite category of a property based on beds, baths, and size.
 * @param {Object} property - Property object containing beds, baths, and myhome_floor_area_value.
 * @returns {string} - Composite category string (e.g., 'medium-medium-large').
 */
export const getPropertyCategory = (property) => {
  const bedsCategory = classifyBeds(property.beds);
  const bathsCategory = classifyBaths(property.baths);
  const sizeCategory = classifySize(property.myhome_floor_area_value);
  return `${bedsCategory}-${bathsCategory}-${sizeCategory}`;
};

// --------------------------------------------
// Similarity Calculation
// --------------------------------------------

/**
 * Calculate similarity based on category match and geographic distance.
 * @param {Object} property - Property object containing necessary attributes.
 * @param {Object} inputs - Input parameters including lat, lng, beds, baths, size.
 * @returns {Object} - Property object augmented with categoryScore and distance.
 */
export const calculateSimilarity = (property, inputs) => {
  // Map inputs.size to myhome_floor_area_value for classification
  const inputForCategory = {
    beds: inputs.beds,
    baths: inputs.baths,
    myhome_floor_area_value: inputs.size,
  };

  const inputCategory = getPropertyCategory(inputForCategory);
  const propertyCategory = getPropertyCategory(property);

  // Category Match Score: 1 point for each matching aspect (beds, baths, size)
  let categoryScore = 0;
  const [inputBeds, inputBaths, inputSize] = inputCategory.split('-');
  const [propBeds, propBaths, propSize] = propertyCategory.split('-');

  if (inputBeds === propBeds) categoryScore += 1;
  if (inputBaths === propBaths) categoryScore += 1;
  if (inputSize === propSize) categoryScore += 1;

  // Distance Score
  const distance = haversineDistance(
    inputs.lat,
    inputs.lng,
    parseFloat(property.latitude),
    parseFloat(property.longitude)
  );

  return { 
    ...property, 
    categoryScore, 
    distance 
  };
};

// --------------------------------------------
// Combined Score Calculation
// --------------------------------------------

/**
 * Calculate the Combined Score based on Category Match and Geographic Distance.
 * @param {Object} property - Property object containing categoryScore and distance.
 * @param {Object} options - Configuration options for scoring.
 * @param {number} options.geoWeight - Weight for the geographic score.
 * @param {number} options.maxDistanceKm - Maximum distance in kilometers for decay.
 * @param {number} options.decayRate - Decay rate for exponential decay.
 * @returns {Object} - Property object augmented with combinedScore.
 */
export const calculateCombinedScore = (
  property, 
  { geoWeight = 0.7, maxDistanceKm = 3, decayRate = 1.0 } = {}
) => {
  // Calculate Geo Score using exponential decay
  const geoScore = Math.exp(-decayRate * (property.distance / maxDistanceKm));
  
  // Scale categoryScore to [0,1] by dividing by maximum possible score (3)
  const categoryScoreScaled = property.categoryScore / 3;
  
  // Calculate Combined Score
  const combinedScore = (geoWeight * geoScore) + ((1 - geoWeight) * categoryScoreScaled);
  
  return { ...property, combinedScore };
};

// --------------------------------------------
// Weighted Valuation Estimate Function
// --------------------------------------------

/**
 * Estimate the property value based on the weighted average of the top N similar properties.
 * @param {Array} sortedProperties - Array of property objects sorted by combinedScore (descending).
 * @param {number} topN - Number of top properties to include in the estimation.
 * @returns {number|null} - Estimated property value or null if no properties are available.
 */
export const estimatePropertyValueWeightedAverage = (sortedProperties, topN = 10) => {
  if (!Array.isArray(sortedProperties) || sortedProperties.length === 0) {
      console.warn("No properties available for estimation.");
      return null;
  }

  // Select the top N properties
  const topProperties = sortedProperties.slice(0, topN);

  // Calculate weights as inverse of (combinedScore + epsilon) to avoid division by zero
  const epsilon = 1e-5;
  const weights = topProperties.map(prop => 1 / (prop.combinedScore + epsilon));

  // Calculate the sum of all weights
  const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);

  // Normalize the weights so that their sum equals 1
  const normalizedWeights = weights.map(weight => weight / totalWeight);

  // Calculate the weighted average of the sale_price
  const estimatedValue = topProperties.reduce((acc, prop, index) => {
      // Ensure the property has a valid sale_price
      const price = parseFloat(prop.sale_price);
      if (isNaN(price)) {
          console.warn(`Invalid sale_price for property at index ${index}. Skipping this property.`);
          return acc;
      }
      return acc + (price * normalizedWeights[index]);
  }, 0);

  console.info(`Estimated Property Value (Weighted Average) using top ${topN} properties: €${estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  return estimatedValue;
};

// --------------------------------------------
// Prepare Properties for Valuation
// --------------------------------------------

/**
 * Prepare properties by calculating similarity and combined scores, then sorting them.
 * @param {Array} properties - Array of property objects.
 * @param {Object} inputs - Input parameters including lat, lng, beds, baths, size.
 * @param {Object} options - Configuration options for scoring.
 * @param {number} options.geoWeight - Weight for the geographic score.
 * @param {number} options.maxDistanceKm - Maximum distance in kilometers for decay.
 * @param {number} options.decayRate - Decay rate for exponential decay.
 * @returns {Array} - Array of property objects augmented with combinedScore, sorted descendingly.
 */
export const preparePropertiesForValuation = (
  properties, 
  inputs, 
  { geoWeight = 0.7, maxDistanceKm = 3, decayRate = 1.0 } = {}
) => {
  // Step 1: Calculate similarity for each property
  const similarProperties = properties.map(property => calculateSimilarity(property, inputs));

  // Step 2: Filter properties with at least one matching category
  const filteredProperties = similarProperties.filter(p => p.categoryScore > 0);

  // Step 3: Calculate combined score for each property
  const propertiesWithCombinedScore = filteredProperties.map(property => calculateCombinedScore(property, { geoWeight, maxDistanceKm, decayRate }));

  // Step 4: Sort properties by combined score in descending order
  const sortedProperties = propertiesWithCombinedScore.sort((a, b) => b.combinedScore - a.combinedScore);

  return sortedProperties;
};
