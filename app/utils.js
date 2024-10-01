// utils.js

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
  
  export const calculateMedian = (arr) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  
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
  
  // Classification Functions
  export const classifyBeds = (beds) => {
    if (beds <= 2) return 'small';
    if (beds <= 4) return 'medium';
    return 'large';
  };
  
  export const classifyBaths = (baths) => {
    if (baths <= 1) return 'small';
    if (baths <= 2) return 'medium';
    return 'large';
  };
  
  export const classifySize = (size) => {
    if (size <= 100) return 'small';
    if (size <= 200) return 'medium';
    return 'large';
  };
  
  // Composite Classification
  export const getPropertyCategory = (property) => {
    const bedsCategory = classifyBeds(property.beds);
    const bathsCategory = classifyBaths(property.baths);
    const sizeCategory = classifySize(property.myhome_floor_area_value);
    return `${bedsCategory}-${bathsCategory}-${sizeCategory}`;
  };
  
  // Calculate Similarity Score based on Category Match and Distance
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
  