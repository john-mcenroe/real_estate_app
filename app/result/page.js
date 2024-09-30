"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../libs/supabaseClient";

// Helper Functions

/**
 * Calculates the Haversine distance between two geographic coordinates.
 * @param {number} lat1 - Latitude of the first location.
 * @param {number} lon1 - Longitude of the first location.
 * @param {number} lat2 - Latitude of the second location.
 * @param {number} lon2 - Longitude of the second location.
 * @returns {number} - Distance in kilometers.
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
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
 * Calculates the median of an array of numbers.
 * @param {number[]} arr - Array of numbers.
 * @returns {number|null} - Median value or null if array is empty.
 */
const calculateMedian = (arr) => {
  if (arr.length === 0) return null;
  const sortedArr = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sortedArr.length / 2);
  return sortedArr.length % 2 !== 0
    ? sortedArr[mid]
    : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
};

/**
 * Calculates the 25th and 75th percentiles of an array of numbers.
 * @param {number[]} arr - Array of numbers.
 * @returns {Object} - Object containing lowerQuartile and upperQuartile.
 */
const calculateConfidenceBands = (arr) => {
  if (arr.length === 0) return { lowerQuartile: null, upperQuartile: null };
  const sortedArr = [...arr].sort((a, b) => a - b);
  const lowerIndex = Math.floor(sortedArr.length * 0.25);
  const upperIndex = Math.floor(sortedArr.length * 0.75);
  const lowerQuartile = sortedArr[lowerIndex];
  const upperQuartile = sortedArr[upperIndex];
  return { lowerQuartile, upperQuartile };
};

/**
 * Calculates a multi-dimensional distance metric based on property features.
 * @param {Object} property - Property object.
 * @param {Object} inputs - User inputs containing beds, baths, size, lat, lng.
 * @param {Object} featureWeights - Weights for each feature.
 * @returns {Object} - Object containing totalDistance and geoDistance.
 */
const calculateMultiDimensionalDistance = (property, inputs, featureWeights) => {
  const { bedsWeight, bathsWeight, sizeWeight, locationWeight } = featureWeights;

  // Define maximum expected differences for normalization
  const MAX_BEDS_DIFF = 5; // Adjust based on your data
  const MAX_BATHS_DIFF = 5; // Adjust based on your data
  const MAX_SIZE_DIFF = 300; // Adjust based on your data
  const MAX_GEO_DISTANCE = 100; // Maximum distance considered is 100 km

  const bedsDiff = Math.min(Math.abs(property.beds - inputs.beds) / MAX_BEDS_DIFF, 1);
  const bathsDiff = Math.min(Math.abs(property.baths - inputs.baths) / MAX_BATHS_DIFF, 1);
  const sizeDiff = Math.min(Math.abs(property.myhome_floor_area_value - inputs.size) / MAX_SIZE_DIFF, 1);

  const geoDistance = Math.min(
    haversineDistance(
      inputs.lat,
      inputs.lng,
      parseFloat(property.latitude),
      parseFloat(property.longitude)
    ),
    MAX_GEO_DISTANCE
  ); // Distance in km

  const normalizedGeoDistance = geoDistance / MAX_GEO_DISTANCE; // Normalize to 0-1

  const totalDistance =
    bedsWeight * bedsDiff +
    bathsWeight * bathsDiff +
    sizeWeight * sizeDiff +
    locationWeight * normalizedGeoDistance;

  return { totalDistance, geoDistance };
};

function ResultComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [medianPrice, setMedianPrice] = useState(null);
  const [confidenceBands, setConfidenceBands] = useState(null);
  const [error, setError] = useState(null); // State to handle errors

  // Extract latitude, longitude, and address from query params
  const lat = parseFloat(searchParams.get("lat")) || 0;
  const lng = parseFloat(searchParams.get("lng")) || 0;
  const address = searchParams.get("address");

  // Default fallback values for beds, baths, size
  const [beds, setBeds] = useState(parseFloat(searchParams.get("beds")) || 1);
  const [baths, setBaths] = useState(parseFloat(searchParams.get("baths")) || 1);
  const [size, setSize] = useState(parseFloat(searchParams.get("size")) || 30);

  // Number of top properties to consider for valuation
  const TOP_N = 10;

  // Feature Weights (Adjust these weights as needed)
  const featureWeights = {
    bedsWeight: 1,
    bathsWeight: 1,
    sizeWeight: 1,
    locationWeight: 2, // Giving more weight to location
  };

  /**
   * Handles changes to the beds input.
   */
  const handleBedsChange = (e) => {
    const newBeds = parseInt(e.target.value, 10) || 1;
    setBeds(newBeds);
    updateURL(newBeds, baths, size);
  };

  /**
   * Handles changes to the baths input.
   */
  const handleBathsChange = (e) => {
    const newBaths = parseInt(e.target.value, 10) || 1;
    setBaths(newBaths);
    updateURL(beds, newBaths, size);
  };

  /**
   * Handles changes to the size input.
   */
  const handleSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10) || 30;
    setSize(newSize);
    updateURL(beds, baths, newSize);
  };

  /**
   * Updates the URL search parameters based on user inputs.
   * @param {number} newBeds - Updated number of beds.
   * @param {number} newBaths - Updated number of baths.
   * @param {number} newSize - Updated size in m².
   */
  const updateURL = (newBeds, newBaths, newSize) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      beds: newBeds.toString(),
      baths: newBaths.toString(),
      size: newSize.toString(),
    });

    // Include address if it exists
    if (address) {
      params.set("address", address);
    }

    router.push(`?${params.toString()}`);
  };

  /**
   * Fetches properties from Supabase and processes them.
   */
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null); // Reset previous errors
    try {
      // Fetch data from Supabase
      const { data, error: fetchError } = await supabase
        .from("scraped_property_data_v1")
        .select(`
          *,
          latitude,
          longitude,
          sale_date,
          sale_price,
          myhome_link,
          asking_price,
          first_list_date,
          beds,
          baths,
          myhome_floor_area_value,
          energy_rating,
          address
        `);

      if (fetchError) throw new Error(fetchError.message);

      console.log("Fetched Data:", data); // Debugging

      if (!Array.isArray(data)) {
        throw new Error("Unexpected data format received from Supabase.");
      }

      // Filter out properties with missing or invalid data
      const filteredProperties = data.filter((property) => {
        const hasValidCoordinates =
          property.latitude &&
          property.longitude &&
          !isNaN(parseFloat(property.latitude)) &&
          !isNaN(parseFloat(property.longitude));

        const hasValidDetails =
          property.myhome_floor_area_value != null &&
          !isNaN(parseFloat(property.myhome_floor_area_value)) &&
          property.beds != null &&
          !isNaN(parseInt(property.beds, 10)) &&
          property.baths != null &&
          !isNaN(parseInt(property.baths, 10));

        return hasValidCoordinates && hasValidDetails;
      });

      console.log("Filtered Properties:", filteredProperties); // Debugging

      if (filteredProperties.length === 0) {
        console.warn("No properties after filtering.");
        setProperties([]);
        setMedianPrice(null);
        setConfidenceBands(null);
        setLoading(false);
        return;
      }

      // Define input parameters
      const inputParams = { beds, baths, size, lat, lng };

      // Calculate multi-dimensional distance for each property
      const propertiesWithDistance = filteredProperties
        .map((property) => {
          const { totalDistance, geoDistance } = calculateMultiDimensionalDistance(
            property,
            inputParams,
            featureWeights
          );
          return { ...property, totalDistance, geoDistance };
        })
        .filter((property) => property.totalDistance <= 2.0) // Adjusted threshold
        .sort((a, b) => a.totalDistance - b.totalDistance) // Sort ascending based on totalDistance
        .slice(0, TOP_N); // Take top N properties

      console.log("Properties with Distance:", propertiesWithDistance); // Debugging

      if (propertiesWithDistance.length === 0) {
        console.warn("No properties after distance filtering.");
        setProperties([]);
        setMedianPrice(null);
        setConfidenceBands(null);
        setLoading(false);
        return;
      }

      // Valuation based on top N properties
      const topPrices = propertiesWithDistance
        .map((property) => parseFloat(property.sale_price))
        .filter((price) => !isNaN(price) && price > 0);

      console.log("Top Prices:", topPrices); // Debugging

      if (topPrices.length > 0) {
        setMedianPrice(calculateMedian(topPrices));
        setConfidenceBands(calculateConfidenceBands(topPrices));
      } else {
        console.warn("No valid prices found for valuation.");
        setMedianPrice(null);
        setConfidenceBands(null);
      }

      setProperties(propertiesWithDistance);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      console.error("Error fetching properties:", err);
    } finally {
      setLoading(false);
    }
  }, [beds, baths, size, lat, lng, featureWeights]);

  useEffect(() => {
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      fetchProperties();
    } else {
      setError("Invalid or missing location data.");
      setLoading(false);
    }
  }, [lat, lng, beds, baths, size, fetchProperties]);

  if (loading) {
    return <div className="text-center">Loading properties...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top-Left Module: House Details */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">House Details</h2>
          {address ? (
            <div>
              <p>
                <strong>Address:</strong> {address}
              </p>
              {/* Inputs for Beds, Baths, Size */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="beds"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Beds
                  </label>
                  <input
                    type="number"
                    id="beds"
                    name="beds"
                    min="1"
                    max="10"
                    step="1"
                    value={beds}
                    onChange={handleBedsChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="baths"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Baths
                  </label>
                  <input
                    type="number"
                    id="baths"
                    name="baths"
                    min="1"
                    max="10"
                    step="1"
                    value={baths}
                    onChange={handleBathsChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="size"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Size (m²)
                  </label>
                  <input
                    type="number"
                    id="size"
                    name="size"
                    min="10"
                    max="500"
                    step="10"
                    value={size}
                    onChange={handleSizeChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-700">No location data available.</p>
          )}
        </div>

        {/* Top-Right Module: Price Estimate */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Price Estimate</h2>
          {medianPrice !== null ? (
            <>
              <p className="text-2xl font-bold text-green-500">
                €{medianPrice.toLocaleString()}
              </p>
              {confidenceBands.lowerQuartile !== null &&
                confidenceBands.upperQuartile !== null && (
                  <p className="text-sm text-gray-500 mt-2">
                    50% confidence range: €{confidenceBands.lowerQuartile.toLocaleString()} - €
                    {confidenceBands.upperQuartile.toLocaleString()}
                  </p>
                )}
            </>
          ) : (
            <p className="text-gray-700">No valuation data available.</p>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recently Sold Nearby</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.length > 0 ? (
            properties.map((property, index) => (
              <div key={index} className="border p-4 rounded-lg shadow-md bg-white">
                <p className="font-semibold text-blue-600 hover:underline">
                  {property.myhome_link ? (
                    <a
                      href={property.myhome_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      {property.address}
                    </a>
                  ) : (
                    property.address
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Distance from your location:{" "}
                  {property.geoDistance !== undefined && !isNaN(property.geoDistance)
                    ? `${property.geoDistance.toFixed(2)} km`
                    : "N/A"}
                </p>
                <div className="flex justify-between mt-3">
                  <div>
                    <p className="text-sm">
                      <strong>Price Sold:</strong> €{Number(property.sale_price).toLocaleString("en-IE")}
                    </p>
                    <p className="text-sm">
                      <strong>Date Sold:</strong>{" "}
                      {property.sale_date
                        ? new Date(property.sale_date).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm">
                      <strong>Price Asked:</strong>{" "}
                      {property.asking_price
                        ? `€${Number(property.asking_price).toLocaleString("en-IE")}`
                        : "N/A"}
                    </p>
                    <p className="text-sm">
                      <strong>First List Date:</strong>{" "}
                      {property.first_list_date
                        ? new Date(property.first_list_date).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
                  <p>
                    <strong>Beds:</strong> {property.beds}
                  </p>
                  <p>
                    <strong>Baths:</strong> {property.baths}
                  </p>
                  <p>
                    <strong>BER:</strong> {property.energy_rating || "N/A"}
                  </p>
                  <p>
                    <strong>Size:</strong> {property.myhome_floor_area_value} m²
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-700">No properties found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultComponent />
    </Suspense>
  );
}
