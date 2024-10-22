"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from '@supabase/supabase-js'

console.log('Node environment:', process.env.NODE_ENV);
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('All environment variables:', process.env);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not set. 
    Node env: ${process.env.NODE_ENV}, 
    Available vars: ${Object.keys(process.env).join(', ')}`)
}

const supabase = createClient(supabaseUrl, supabaseKey)

import {
  haversineDistance
} from "../utils";
import Modal from "../../components/Modal";
import { FaEdit } from 'react-icons/fa'; // Import the edit icon
import Script from 'next/script';

function ResultComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const latParam = parseFloat(searchParams.get("lat"));
  const lngParam = parseFloat(searchParams.get("lng"));

  // State to control Modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Centralized filter state initialized from URL search params
  const [filters, setFilters] = useState({
    lat: isNaN(latParam) ? null : latParam,
    lng: isNaN(lngParam) ? null : lngParam,
    address: searchParams.get("address") || "",
    beds: searchParams.get("beds") || "",
    baths: searchParams.get("baths") || "",
    size: searchParams.get("size") || "",
    property_type: searchParams.get("property_type") || "",
    ber_rating: searchParams.get("ber_rating") || "",
  });

  // Temporary state for handling form inputs before submission
  const [tempFilters, setTempFilters] = useState(filters);

  const [state, setState] = useState({
    properties: [],
    loading: true,
    medianPrice: null,
    confidenceBands: null,
    error: null,
  });

  const { beds, baths, size, property_type, ber_rating, lat, lng, address } = filters;

  const TOP_N = 30;

  // State to hold generated columns from the server
  const [generatedColumns, setGeneratedColumns] = useState(null);
  const [xgboostPrediction, setXgboostPrediction] = useState(null);

  // Handle input changes in the filter form
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setTempFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Handle filter form submission
  const handleRecalculate = (e) => {
    e.preventDefault();
    
    let newAddress = tempAddress;
    let newLat = filters.lat;
    let newLng = filters.lng;

    if (selectedPlace && selectedPlace.geometry) {
      newAddress = selectedPlace.formatted_address;
      newLat = selectedPlace.geometry.location.lat();
      newLng = selectedPlace.geometry.location.lng();
    }

    const newFilters = {
      ...tempFilters,
      address: newAddress,
      lat: newLat,
      lng: newLng,
    };

    setFilters(newFilters);
    updateURL(newFilters);
    setIsEditing(false);
    setState({
      properties: [],
      loading: true,
      medianPrice: null,
      confidenceBands: null,
      error: null,
    });
    setGeneratedColumns(null);
    setXgboostPrediction(null);
    fetchProperties();
  };

  // Update URL search parameters based on filters
  const updateURL = (newFilters) => {
    const params = new URLSearchParams(newFilters);
    router.push(`/result?${params.toString()}`);
  };

  // Handle Modal form submission
  const handleModalSubmit = (newFilters) => {
    setFilters(newFilters);
    updateURL(newFilters);
    setTempFilters(newFilters); // Update temporary filters as well
  };

  // Fetch properties based on current filters
  const fetchProperties = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      if (!lat || !lng) {
        throw new Error("Latitude and longitude are required");
      }

      console.log("Fetching properties with filters:", filters);

      // Fetch properties from Supabase
      const { data: properties, error } = await supabase
        .from("scraped_property_data_v2") // Updated table name
        .select(`
          id,
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
        `)
        // .order("sale_date", { ascending: false }); // Remove this line

      if (error) {
        console.error("Supabase Error:", error);
        throw new Error(error.message || "Failed to fetch properties from Supabase.");
      }

      console.log("Fetched data:", properties);

      const filtered = properties.filter(
        (p) =>
          p.latitude &&
          p.longitude &&
          !isNaN(parseFloat(p.latitude)) &&
          !isNaN(parseFloat(p.longitude)) &&
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
      const response = await fetch("/api/generate_columns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          beds,
          baths,
          size,
          property_type,
          ber_rating,
          latitude: lat,
          longitude: lng,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from generate_columns:", errorData);
        throw new Error(
          `Failed to generate additional columns: ${errorData.message || JSON.stringify(errorData)}`
        );
      }

      const generatedColumnsData = await response.json();
      console.log("Generated columns data:", generatedColumnsData);
      setGeneratedColumns(generatedColumnsData);

      // Call the XGBoost prediction API
      const predictionResponse = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalInputs: {
            property_type,
            size,
            ber_rating,
            latitude: lat,
            longitude: lng,
            beds,
            baths,
          },
          ...generatedColumnsData,
        }),
      });

      if (!predictionResponse.ok) {
        const predictionErrorData = await predictionResponse.json();
        console.error("Error response from XGBoost prediction:", predictionErrorData);
        throw new Error(
          `Failed to get XGBoost prediction: ${predictionErrorData.message || JSON.stringify(predictionErrorData)}`
        );
      }

      const predictionResult = await predictionResponse.json();
      console.log("Received prediction:", predictionResult.prediction);

      // Round the prediction to the nearest $10
      const roundedPrediction = Math.round(predictionResult.prediction / 10) * 10;
      setXgboostPrediction(roundedPrediction);

      const lowerBound = roundedPrediction * 0.9; // 10% lower
      const upperBound = roundedPrediction * 1.2; // 20% higher

      // Calculate similarity scores and filter properties
      const propertiesWithSimilarity = filtered
        .map((property) => ({
          ...property,
          distance: haversineDistance(lat, lng, property.latitude, property.longitude),
          myhome_floor_area_value: property.myhome_floor_area_value != null ? 
            parseFloat(property.myhome_floor_area_value) : 
            null
        }))
        .filter((p) => 
          p.distance <= 10 && // Limit to properties within 10 km
          p.sale_price >= lowerBound &&
          p.sale_price <= upperBound
        )
        .sort((a, b) => a.distance - b.distance) // Sort by distance
        .slice(0, 28);

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

      setState((prev) => ({
        ...prev,
        properties: propertiesWithSimilarity,
        medianPrice: null, // Removed, as we're using xgboostPrediction
        confidenceBands: null, // Removed
        loading: false,
      }));
    } catch (err) {
      console.error("Error in fetchProperties:", err);
      setState((prev) => ({
        ...prev,
        error: err.message || "An unexpected error occurred.",
        loading: false,
      }));
    }
  }, [filters, beds, baths, size, property_type, ber_rating, lat, lng]);

  useEffect(() => {
    if (filters.lat !== null && filters.lng !== null) {
      fetchProperties();
    } else {
      setState((prev) => ({
        ...prev,
        error: "Invalid or missing location data.",
        loading: false,
      }));
    }
  }, [filters, fetchProperties]);

  useEffect(() => {
    console.log("xgboostPrediction updated:", xgboostPrediction);
  }, [xgboostPrediction]);

  const [isEditing, setIsEditing] = useState(false);
  const [tempAddress, setTempAddress] = useState(filters.address);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const initializeAutocomplete = () => {
    if (window.google && inputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'ie' },
        fields: ['address_components', 'formatted_address', 'geometry'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          setSelectedPlace(place);
          setTempAddress(place.formatted_address);
        }
      });

      autocompleteRef.current = autocomplete;
    }
  };

  useEffect(() => {
    if (isEditing) {
      initializeAutocomplete();
    }
  }, [isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
    setSelectedPlace(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleAddressChange = (e) => {
    setTempAddress(e.target.value);
    setSelectedPlace(null);
  };

  // Add this function inside the ResultComponent
  const handlePropertyClick = (e, link) => {
    if (window.innerWidth < 768) { // Mobile breakpoint
      e.preventDefault();
      window.location.href = link;
    }
  };

  if (state.loading) {
    return <div className="text-center">Loading properties...</div>;
  }

  if (state.error) {
    return <div className="text-red-500 text-center">Error: {state.error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 bg-gradient-to-b from-gray-100 to-white">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&region=IE`}
        strategy="afterInteractive"
      />
      {/* Modal Component */}
      <Modal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        onSubmit={handleModalSubmit}
        initialValues={filters}
      />

      {/* Filters Form */}
      <form onSubmit={handleRecalculate} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* House Details */}
          <div className="bg-gradient-to-b from-blue-50 to-blue-100 p-6 rounded-lg shadow-md border border-blue-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 text-left">House Details</h2>
            <div>
              <div className="flex items-center mb-4 justify-start">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={tempAddress}
                    onChange={handleAddressChange}
                    className="flex-grow p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter address"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRecalculate(e);
                      }
                    }}
                  />
                ) : (
                  <>
                    <p className="text-gray-700 flex-grow text-left">
                      <strong>Address:</strong> {filters.address}
                    </p>
                    <button
                      type="button"
                      onClick={handleEditClick}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                <div>
                  <label htmlFor="beds" className="block text-xs font-medium text-gray-600 mb-1">Beds</label>
                  <input
                    type="number"
                    id="beds"
                    name="beds"
                    min={1}
                    max={10}
                    step={1}
                    value={tempFilters.beds}
                    onChange={handleChange("beds")}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="baths" className="block text-xs font-medium text-gray-600 mb-1">Baths</label>
                  <input
                    type="number"
                    id="baths"
                    name="baths"
                    min={1}
                    max={10}
                    step={1}
                    value={tempFilters.baths}
                    onChange={handleChange("baths")}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="size" className="block text-xs font-medium text-gray-600 mb-1">Size (m²)</label>
                  <input
                    type="number"
                    id="size"
                    name="size"
                    min={10}
                    max={1000}
                    step={10}
                    value={tempFilters.size}
                    onChange={handleChange("size")}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="property_type" className="block text-xs font-medium text-gray-600 mb-1">Property Type</label>
                  <select
                    id="property_type"
                    name="property_type"
                    value={tempFilters.property_type}
                    onChange={handleChange("property_type")}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="bungalow">Bungalow</option>
                    <option value="cottage">Cottage</option>
                    <option value="villa">Villa</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ber_rating" className="block text-xs font-medium text-gray-600 mb-1">BER Rating</label>
                  <select
                    id="ber_rating"
                    name="ber_rating"
                    value={tempFilters.ber_rating}
                    onChange={handleChange("ber_rating")}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Rating</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="A3">A3</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="B3">B3</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                    <option value="C3">C3</option>
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                    <option value="E1">E1</option>
                    <option value="E2">E2</option>
                    <option value="F">F</option>
                    <option value="G">G</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-md font-semibold text-lg shadow-sm hover:bg-blue-100 hover:border-blue-300 transition duration-300"
                >
                  Recalculate
                </button>
              </div>
            </div>
          </div>

          {/* Price Estimate */}
          <div className="bg-gradient-to-b from-blue-50 to-blue-100 p-6 rounded-lg shadow-md border border-blue-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center md:text-left">Price Estimate</h2>
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="w-full md:w-1/2 text-center md:text-left">
                {xgboostPrediction !== null && !isNaN(xgboostPrediction) ? (
                  <>
                    <p className="text-5xl font-extrabold text-green-500 mb-2">
                      {formatCurrency(Math.round(xgboostPrediction / 10000) * 10000)}
                    </p>
                    <p className="text-xl text-gray-700">
                      Range: {formatCurrency(Math.round((xgboostPrediction * 0.9) / 10000) * 10000)} - {formatCurrency(Math.round((xgboostPrediction * 1.2) / 10000) * 10000)}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-700">No valuation data available.</p>
                )}
              </div>
              <div className="w-full md:w-1/2 mt-6 md:mt-0 flex flex-col items-center md:items-center">
                <div className="w-64 flex flex-col items-start md:mr-12">
                  <button className="w-full py-4 bg-blue-500 text-white rounded-full font-bold text-xl shadow-md hover:bg-blue-600 transition duration-300">
                    Get Instant Cash Offers
                  </button>
                  <p className="mt-3 text-sm text-gray-600 max-w-xs">
                    No obligation to get started. Take the first step to selling your house.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Results Section */}
      <div className="mt-8">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center md:text-left">Recently Sold Nearby</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.properties.length ? (
            state.properties.map((property, index) => (
              <div key={index} className="group h-full">
                <a
                  href={property.myhome_link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handlePropertyClick(e, property.myhome_link)}
                  className={`block bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition duration-300 ease-in-out h-full flex flex-col ${
                    property.myhome_link ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <p className="font-semibold text-blue-600 group-hover:underline mb-2 text-lg text-center md:text-left">
                    {property.address}
                  </p>
                  <p className="text-sm text-gray-600 mb-2 text-center md:text-left">
                    Distance: {property.distance?.toFixed(2) || "N/A"} km
                  </p>
                  <div className="mb-4 text-center md:text-left">
                    <p className="text-2xl font-bold text-blue-600">
                      €{Number(property.sale_price).toLocaleString("en-IE")}
                    </p>
                    <p className="text-sm text-gray-700">
                      Sold: {property.sale_date ? new Date(property.sale_date).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="mb-4 text-center md:text-left">
                    <p className="text-lg text-gray-600">
                      Listed: €{Number(property.asking_price).toLocaleString("en-IE")}
                    </p>
                    <p className="text-xs text-gray-500">
                      Date: {property.first_list_date ? new Date(property.first_list_date).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  {/* Property Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    <p className="text-center md:text-left"><strong>Beds:</strong> {property.beds}</p>
                    <p className="text-center md:text-left"><strong>Baths:</strong> {property.baths}</p>
                    <p className="text-center md:text-left"><strong>BER:</strong> {property.energy_rating || "N/A"}</p>
                    <p className="text-center md:text-left"><strong>Size:</strong> {property.myhome_floor_area_value} m²</p>
                  </div>
                </a>
              </div>
            ))
          ) : (
            <p className="text-gray-700 text-center md:text-left">No properties found.</p>
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

// Add this function at the end of your component or in a separate utils file
function formatCurrency(value) {
  if (isNaN(value) || value === null) return '€0';
  
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `€${(value / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  } else {
    return `€${value.toFixed(0)}`;
  }
}
