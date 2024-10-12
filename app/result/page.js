"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../libs/supabaseClient";
import {
  haversineDistance,
  calculateMedian,
  calculateConfidenceBands,
  getPropertyCategory,
  calculateSimilarity,
} from "../utils"; // Adjust the path as necessary

function ResultComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const latParam = parseFloat(searchParams.get("lat"));
  const lngParam = parseFloat(searchParams.get("lng"));

  // Main state holding applied filters and results
  const [state, setState] = useState({
    properties: [],
    loading: true,
    medianPrice: null,
    confidenceBands: null,
    error: null,
    inputs: {
      lat: isNaN(latParam) ? null : latParam,
      lng: isNaN(lngParam) ? null : lngParam,
      address: searchParams.get("address") || "",
      beds: parseInt(searchParams.get("beds"), 10) || 1,
      baths: parseInt(searchParams.get("baths"), 10) || 1,
      size: parseInt(searchParams.get("size"), 10) || 30,
      year_built: parseInt(searchParams.get("year_built"), 10) || null,
      price: parseFloat(searchParams.get("price")) || 0,
      property_type: searchParams.get("property_type") || "",
    },
  });

  // Separate state for filter inputs
  const [filterInputs, setFilterInputs] = useState({
    beds: state.inputs.beds,
    baths: state.inputs.baths,
    size: state.inputs.size,
    year_built: state.inputs.year_built,
    price: state.inputs.price,
    property_type: state.inputs.property_type,
  });

  const { beds, baths, size, year_built, price, property_type, lat, lng, address } = state.inputs;

  const TOP_N = 30;

  // Function to update the URL based on applied filters
  const updateURL = (newInputs) => {
    const params = new URLSearchParams({
      lat: newInputs.lat.toString(),
      lng: newInputs.lng.toString(),
      beds: newInputs.beds.toString(),
      baths: newInputs.baths.toString(),
      size: newInputs.size.toString(),
      year_built: newInputs.year_built ? newInputs.year_built.toString() : '',
      price: newInputs.price.toString(),
      property_type: newInputs.property_type,
    });

    if (newInputs.address) {
      params.set("address", newInputs.address);
    }

    router.push(`?${params.toString()}`);
  };

  // Handle input changes for filterInputs
  const handleChange = (field) => (e) => {
    const value = field === 'property_type' ? e.target.value : e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
    setFilterInputs((prev) => ({ ...prev, [field]: value }));
  };

  // Handle "Recalculate" button click
  const handleRecalculate = () => {
    const newInputs = {
      ...state.inputs,
      beds: filterInputs.beds,
      baths: filterInputs.baths,
      size: filterInputs.size,
      year_built: filterInputs.year_built,
      price: filterInputs.price,
      property_type: filterInputs.property_type,
    };
    setState((prev) => ({ ...prev, inputs: newInputs }));
    updateURL(newInputs);
  };

  const fetchProperties = useCallback(async () => {
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
        setState((prev) => ({
          ...prev,
          properties: [],
          medianPrice: null,
          confidenceBands: null,
          loading: false,
        }));
        return;
      }

      // Call the serverless function to generate additional columns
      const response = await fetch('/api/generate_columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state.inputs),
      });

      if (!response.ok) {
        throw new Error('Failed to generate additional columns');
      }

      const inputPropertyWithAdditionalColumns = await response.json();

      // Calculate similarity scores
      const propertiesWithSimilarity = filtered
        .map((property) => calculateSimilarity(property, inputPropertyWithAdditionalColumns))
        .filter((p) => p.categoryScore > 0)
        .sort((a, b) => {
          // Higher categoryScore is better; if equal, closer distance is better
          if (b.categoryScore !== a.categoryScore) {
            return b.categoryScore - a.categoryScore;
          }
          return a.distance - b.distance;
        })
        .slice(0, TOP_N);

      console.log("Properties with similarity:", propertiesWithSimilarity);

      if (!propertiesWithSimilarity.length) {
        setState((prev) => ({
          ...prev,
          properties: [],
          medianPrice: null,
          confidenceBands: null,
          loading: false,
        }));
        return;
      }

      const topPrices = propertiesWithSimilarity
        .map((p) => parseFloat(p.sale_price))
        .filter((price) => !isNaN(price) && price > 0);

      setState((prev) => ({
        ...prev,
        properties: propertiesWithSimilarity,
        medianPrice: topPrices.length ? calculateMedian(topPrices) : null,
        confidenceBands: topPrices.length
          ? calculateConfidenceBands(topPrices)
          : { lowerQuartile: null, upperQuartile: null },
        loading: false,
      }));
    } catch (err) {
      console.error("Error fetching properties:", err);
      setState((prev) => ({
        ...prev,
        error: err.message || "An unexpected error occurred.",
        loading: false,
      }));
    }
  }, [state.inputs]);

  useEffect(() => {
    if (lat !== null && lng !== null) {
      fetchProperties();
    } else {
      setState((prev) => ({
        ...prev,
        error: "Invalid or missing location data.",
        loading: false,
      }));
    }
  }, [lat, lng, fetchProperties]);

  if (state.loading) {
    return <div className="text-center">Loading properties...</div>;
  }

  if (state.error) {
    return <div className="text-red-500 text-center">Error: {state.error}</div>;
  }

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
                    max={1000} // Increased max to accommodate Very Large properties
                    step={10}
                    value={filterInputs.size}
                    onChange={handleChange("size")}
                    className="mt-1 w-24 p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {/* Year Built Input */}
                <div className="flex flex-col">
                  <label
                    htmlFor="year_built"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Year Built
                  </label>
                  <input
                    type="number"
                    id="year_built"
                    name="year_built"
                    min={1900}
                    max={2023}
                    step={1}
                    value={filterInputs.year_built || ''}
                    onChange={handleChange("year_built")}
                    className="mt-1 w-24 p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {/* Price Input */}
                <div className="flex flex-col">
                  <label
                    htmlFor="price"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Price (€)
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    min={0}
                    step={1000}
                    value={filterInputs.price || ''}
                    onChange={handleChange("price")}
                    className="mt-1 w-32 p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {/* Property Type Input */}
                <div className="flex flex-col">
                  <label
                    htmlFor="property_type"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Property Type
                  </label>
                  <select
                    id="property_type"
                    name="property_type"
                    value={filterInputs.property_type}
                    onChange={handleChange("property_type")}
                    className="mt-1 w-32 p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Apartment">Apartment</option>
                    <option value="House">House</option>
                    <option value="Bungalow">Bungalow</option>
                    <option value="Studio">Studio</option>
                    <option value="Villa">Villa</option>
                    {/* Add more options as needed */}
                  </select>
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
            </div>
          ) : (
            <p className="text-gray-700">No location data available.</p>
          )}
        </div>

        {/* Price Estimate */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Price Estimate</h2>
          {state.medianPrice !== null ? (
            <>
              <p className="text-2xl font-bold text-green-500">
                €{state.medianPrice.toLocaleString()}
              </p>
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
          {state.properties.length ? (
            state.properties.map((property, index) => (
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
                {/* Updated Property Details */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
                  {/* Beds */}
                  <p>
                    <strong>Beds:</strong> {property.beds}
                  </p>
                  {/* Baths */}
                  <p>
                    <strong>Baths:</strong> {property.baths}
                  </p>
                  <p>
                    <strong>BER:</strong> {property.energy_rating || "N/A"}
                  </p>
                  <p>
                    <strong>Size:</strong> {property.myhome_floor_area_value} m²
                  </p>
                  {/* Removed Category */}
                  {/* <p>
                    <strong>Category:</strong> {property.category || "N/A"}
                  </p> */}
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