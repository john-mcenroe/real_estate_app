'use client'; // Enable client-side rendering

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../libs/supabaseClient'; // Adjust path to point to supabase client

// Haversine formula to calculate the distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;

  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon1 - lon2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
}

// Helper function to calculate median
function calculateMedian(arr) {
  const sortedArr = arr.sort((a, b) => a - b);
  const mid = Math.floor(sortedArr.length / 2);

  return sortedArr.length % 2 !== 0
    ? sortedArr[mid]
    : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
}

// Helper function to calculate the 75% confidence bands
function calculateConfidenceBands(arr) {
  const sortedArr = arr.sort((a, b) => a - b);
  const lowerQuartile = sortedArr[Math.floor(sortedArr.length * 0.25)];
  const upperQuartile = sortedArr[Math.floor(sortedArr.length * 0.75)];
  return { lowerQuartile, upperQuartile };
}

export default function ResultPage() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [medianPrice, setMedianPrice] = useState(null);
  const [confidenceBands, setConfidenceBands] = useState(null);

  // Extract latitude, longitude, and address from query params
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));
  const address = searchParams.get('address');

  // Check the lat/lng parameters
  console.log('Latitude:', lat);
  console.log('Longitude:', lng);

  // Fetch data from Supabase and calculate distances
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('scraped_property_data_v1')  // Table name
          .select('*, latitude, longitude, sale_date, myhome_link');  // Fetch myhome_link column

        if (error) {
          console.error('Error fetching data:', error.message);
        } else {
          console.log('Raw data from Supabase:', data);  // Debugging line to check raw data

          // Filter properties by latitude/longitude and calculate distances
          const propertiesWithDistance = data
            .filter(property => property.latitude && property.longitude)  // Ensure latitude and longitude exist
            .map((property) => {
              const distance = haversineDistance(lat, lng, parseFloat(property.latitude), parseFloat(property.longitude));
              return { ...property, distance };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 21);  // Limit to top 21 properties based on distance

          console.log('Filtered properties with distance:', propertiesWithDistance);  // Debugging line

          setProperties(propertiesWithDistance);

          // Calculate median price and confidence bands
          const top21Prices = propertiesWithDistance.map(property => property.sale_price);
          if (top21Prices.length > 0) {
            setMedianPrice(calculateMedian(top21Prices));
            setConfidenceBands(calculateConfidenceBands(top21Prices));
          }
        }
      } catch (error) {
        console.error('Error in Supabase query:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [lat, lng]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1 bg-gray-100 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">House Details</h2>
          {address ? (
            <div>
              <p><strong>Address:</strong> {address}</p>
            </div>
          ) : (
            <p>No location data available.</p>
          )}
        </div>

        <div className="col-span-1 bg-gray-100 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Value Estimate</h2>
          {medianPrice !== null ? (
            <>
              <p className="text-2xl font-bold text-green-500">€{medianPrice.toLocaleString()}</p>
              {confidenceBands && (
                <p className="text-sm text-gray-500">
                  75% confidence range: €{confidenceBands.lowerQuartile.toLocaleString()} - €
                  {confidenceBands.upperQuartile.toLocaleString()}
                </p>
              )}
            </>
          ) : (
            <p>No valuation data available.</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Similar Properties</h2>
        <div className="grid grid-cols-3 gap-4">
          {loading ? (
            <p>Loading properties...</p>
          ) : (
            properties.length > 0 ? (
              properties.map((property, index) => (
                <div key={index} className="border p-4 rounded-lg shadow-md">
                  <p>
                    <strong>Address:</strong>{" "}
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
                  <p><strong>Price:</strong> €{property.sale_price.toLocaleString('en-IE')}</p>
                  <div className="grid grid-cols-1 gap-1">
                    <p><strong>Beds:</strong> {property.beds.includes('Bed') ? property.beds : `${property.beds} Bed`}</p>
                    <p><strong>Baths:</strong> {property.baths.includes('Bath') ? property.baths : `${property.baths} Bath`}</p>
                    <p><strong>BER:</strong> {property.energy_rating}</p>
                    <p><strong>Size:</strong> {property.myhome_floor_area_value}</p>
                  </div>
                  <p><strong>Distance from your location:</strong> {property.distance ? property.distance.toFixed(2) : 'N/A'} km</p>
                  <p><strong>Date Sold:</strong> {property.sale_date ? property.sale_date : 'N/A'}</p>
                </div>
              ))
            ) : (
              <p>No properties found.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}