// results.js

"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../libs/supabaseClient";
import {
  haversineDistance,
  calculateMedian,
  calculateConfidenceBands,
  getPropertyCategory,
  calculateSimilarity,
  calculateCombinedScore,
  estimatePropertyValueWeightedAverage,
  preparePropertiesForValuation,
} from "../utils"; // Adjust the path as necessary

function ResultComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extract initial parameters from URL
  const latParam = parseFloat(searchParams.get("lat"));
  const lngParam = parseFloat(searchParams.get("lng"));

  // Initialize state with inputs from URL or defaults
  const [inputs, setInputs] = useState({
    lat: isNaN(latParam) ? null : latParam,
    lng: isNaN(lngParam) ? null : lngParam,
    address: searchParams.get("address") || "",
    beds: parseInt(searchParams.get("beds"), 10) || 1,
    baths: parseInt(searchParams.get("baths"), 10) || 1,
    size: parseInt(searchParams.get("size"), 10) || 30,
  });

  // Separate state for filter form inputs
  const [filterInputs, setFilterInputs] = useState({
    beds: inputs.beds,
    baths: inputs.baths,
    size: inputs.size,
  });

  // State for sorting option
  const [sortOption, setSortOption] = useState("combinedScore"); // Default sort by Combined Score

  const { beds, baths, size, lat, lng, address } = inputs;

  const TOP_N = 30;

  // Function to update the URL based on applied filters
  const updateURL = (newInputs) => {
    const params = new URLSearchParams({
      lat: newInputs.lat.toString(),
      lng: newInputs.lng.toString(),
      beds: newInputs.beds.toString(),
      baths: newInputs.baths.toString(),
      size: newInputs.size.toString(),
    });

    if (newInputs.address) {
      params.set("address", newInputs.address);
    }

    // Use replace to avoid adding to browser history unnecessarily
    router.replace(`?${params.toString()}`);
  };

  // Handle input changes for filterInputs
  const handleChange = (field) => (e) => {
    const value = parseInt(e.target.value, 10);
    setFilterInputs((prev) => ({ ...prev, [field]: isNaN(value) ? "" : value }));
  };

  // Handle "Recalculate" button click
  const handleRecalculate = () => {
    const newInputs = {
      ...inputs,
      beds: filterInputs.beds,
      baths: filterInputs.baths,
      size: filterInputs.size,
    };
    setInputs(newInputs);
    updateURL(newInputs);
  };

  // Handle sorting option change
  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  // Fetch properties based on current inputs
  useEffect(() => {
    const fetchProperties = async () => {
      // If location data is invalid, set error
      if (lat === null || lng === null) {
        setState({
          properties: [],
          loading: false,
          medianPrice: null,
          confidenceBands: null,
          weightedPrice: null,
          error: "Invalid or missing location data.",
        });
        return;
      }

      // Initialize loading state
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data, error } = await supabase
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

        if (error) throw new Error(error.message);
        if (!Array.isArray(data)) throw new Error("Invalid data format.");

        console.log("Fetched data:", data);

        const filtered = data.filter(
          (p) =>
            p.latitude &&
            p.longitude &&
            !isNaN(parseFloat(p.latitude)) &&
            !isNaN(parseFloat(p.longitude)) &&
            p.myhome_floor_area_value != null &&
            !isNaN(parseFloat(p.myhome_floor_area_value)) &&
            p.beds != null &&
            !isNaN(parseInt(p.beds, 10)) &&
            p.baths != null &&
            !isNaN(parseInt(p.baths, 10))
        );

        console.log("Filtered properties:", filtered);

        if (!filtered.length) {
          setState({
            properties: [],
            loading: false,
            medianPrice: null,
            confidenceBands: null,
            weightedPrice: null,
            error: null,
          });
          return;
        }

        // Use the utility function to prepare properties for valuation
        const preparedProperties = preparePropertiesForValuation(filtered, inputs, {
          geoWeight: 0.7,
          maxDistanceKm: 3,
          decayRate: 1.0,
        });

        const topProperties = preparedProperties.slice(0, TOP_N);

        console.log("Prepared and sorted properties:", topProperties);

        if (!topProperties.length) {
          setState({
            properties: [],
            loading: false,
            medianPrice: null,
            confidenceBands: null,
            weightedPrice: null,
            error: null,
          });
          return;
        }

        // Calculate median and confidence bands
        const topPrices = topProperties
          .map((p) => parseFloat(p.sale_price))
          .filter((price) => !isNaN(price) && price > 0);

        // Calculate weighted valuation
        const weightedValue = estimatePropertyValueWeightedAverage(topProperties, TOP_N);

        setState({
          properties: topProperties,
          loading: false,
          medianPrice: topPrices.length ? calculateMedian(topPrices) : null,
          confidenceBands: topPrices.length
            ? calculateConfidenceBands(topPrices)
            : { lowerQuartile: null, upperQuartile: null },
          weightedPrice: weightedValue,
          error: null,
        });
      } catch (err) {
        console.error("Error fetching properties:", err);
        setState({
          properties: [],
          loading: false,
          medianPrice: null,
          confidenceBands: null,
          weightedPrice: null,
          error: err.message || "An unexpected error occurred.",
        });
      }
    };

    fetchProperties();
  }, [inputs, lat, lng]);

  // State to hold fetched properties and related data
  const [state, setState] = useState({
    properties: [],
    loading: true,
    medianPrice: null,
    confidenceBands: null,
    weightedPrice: null,
    error: null,
  });

  if (state.loading) {
    return <div className="text-center">Loading properties...</div>;
  }

  if (state.error) {
    return <div className="text-red-500 text-center">Error: {state.error}</div>;
  }

  // Function to sort properties based on sortOption
  const sortedProperties = [...state.properties].sort((a, b) => {
    if (sortOption === "distance") {
      return a.distance - b.distance; // Ascending order
    } else if (sortOption === "combinedScore") {
      return b.combinedScore - a.combinedScore; // Descending order
    }
    return 0; // Default no sorting
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* House Details */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">House Details</h2>
          {address ? (
            <div>
              <p>
                <strong>Address:</strong> {address}
              </p>
              {/* Inputs and Recalculate Button on the same line */}
              <div className="mt-4 flex flex-wrap items-end space-x-4">
                {/* Beds Input */}
                <div className="flex flex-col">
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
                    min={1}
                    max={10}
                    step={1}
                    value={filterInputs.beds}
                    onChange={handleChange("beds")}
                    className="mt-1 w-20 p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {/* Baths Input */}
                <div className="flex flex-col">
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
                    min={1}
                    max={10}
                    step={1}
                    value={filterInputs.baths}
                    onChange={handleChange("baths")}
                    className="mt-1 w-20 p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {/* Size Input */}
                <div className="flex flex-col">
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
                    min={10}
                    max={1000} // Increased max to accommodate very large properties
                    step={10}
                    value={filterInputs.size}
                    onChange={handleChange("size")}
                    className="mt-1 w-24 p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {/* Recalculate Button */}
                <div className="mt-6 sm:mt-0">
                  <button
                    onClick={handleRecalculate}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={state.loading}
                  >
                    Recalculate
                  </button>
                </div>
              </div>
              {/* Sorting Options */}
              <div className="mt-6">
                <label htmlFor="sort" className="block text-xs font-medium text-gray-600 mb-1">
                  Sort By:
                </label>
                <select
                  id="sort"
                  value={sortOption}
                  onChange={handleSortChange}
                  className="w-full md:w-48 p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="combinedScore">Combined Score (High to Low)</option>
                  <option value="distance">Distance (Low to High)</option>
                </select>
              </div>
            </div>
          ) : (
            <p className="text-gray-700">No location data available.</p>
          )}
        </div>

        {/* Price Estimate */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Price Estimate</h2>
          {state.medianPrice !== null || state.weightedPrice !== null ? (
            <>
              {state.medianPrice !== null && (
                <p className="text-2xl font-bold text-green-500">
                  Median Price: €{state.medianPrice.toLocaleString()}
                </p>
              )}
              {state.weightedPrice !== null && (
                <p className="text-2xl font-bold text-blue-500 mt-2">
                  Weighted Valuation: €{state.weightedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
              {state.confidenceBands.lowerQuartile !== null &&
                state.confidenceBands.upperQuartile !== null && (
                  <p className="text-sm text-gray-500 mt-2">
                    50% confidence range: €{state.confidenceBands.lowerQuartile.toLocaleString()} - €
                    {state.confidenceBands.upperQuartile.toLocaleString()}
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
          {sortedProperties.length ? (
            sortedProperties.map((property, index) => (
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
                  Distance from your location: {property.distance?.toFixed(2) || "N/A"} km
                </p>
                {/* Display Combined Score */}
                <p className="text-sm text-gray-500 mt-1">
                  <strong>Combined Score:</strong> {property.combinedScore.toFixed(2)}
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
                    <strong>Beds:</strong> {property.beds} Bed{property.beds > 1 ? "s" : ""}
                  </p>
                  <p>
                    <strong>Baths:</strong> {property.baths} Bath{property.baths > 1 ? "s" : ""}
                  </p>
                  <p>
                    <strong>BER:</strong> {property.energy_rating || "N/A"}
                  </p>
                  <p>
                    <strong>Size:</strong> {property.myhome_floor_area_value} m²
                  </p>
                  {/* Display Property Category */}
                  <p>
                    <strong>Category:</strong> {property.category || "N/A"}
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
