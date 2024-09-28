'use client'; // Enable client-side rendering

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../libs/supabaseClient'; // Adjust path to point to supabase client

// Haversine formula to calculate the distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;

  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers
  return distance;
}

export default function ResultPage() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Extract latitude, longitude, and address from query params
  const lat = parseFloat(searchParams.get('lat'));  // Convert to float
  const lng = parseFloat(searchParams.get('lng'));  // Convert to float
  const address = searchParams.get('address');

  // Fetch data from Supabase and calculate distances
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('scraped_property_data_v1')  // Your table name
          .select('*, latitude, longitude')  // Select all columns and geolocation data
          .limit(100);                       // Fetch more rows if needed (adjust limit)

        if (error) {
          console.error('Error fetching data:', error.message);
        } else {
          // Filter properties with valid latitude and longitude, calculate distance, and sort
          const propertiesWithDistance = data
            .filter(property => property.latitude && property.longitude)  // Ensure lat/lng exist
            .map((property) => {
              const distance = haversineDistance(lat, lng, property.latitude, property.longitude);
              return { ...property, distance };  // Add distance to each property
            })
            .sort((a, b) => a.distance - b.distance);  // Sort properties by distance

          setProperties(propertiesWithDistance); // Set sorted data
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
      <h1 className="text-2xl font-bold mb-4">Geolocation Results</h1>

      {lat && lng ? (
        <div>
          <p><strong>Address:</strong> {address}</p>
          <p><strong>Latitude:</strong> {lat}</p>
          <p><strong>Longitude:</strong> {lng}</p>
        </div>
      ) : (
        <p>No location data available.</p>
      )}

      <h2 className="text-xl font-semibold mt-6">Property Results (sorted by distance):</h2>

      {loading ? (
        <p>Loading properties...</p>
      ) : (
        <div className="space-y-4">
          {properties.length > 0 ? (
            properties.map((property, index) => (
              <div key={index} className="border-b pb-2">
                <p><strong>Address:</strong> {property.address}</p>
                <p><strong>Price:</strong> €{property.sale_price}</p>
                <p><strong>Beds:</strong> {property.beds}</p>
                <p><strong>Baths:</strong> {property.baths}</p>
                <p><strong>BER:</strong> {property.energy_rating}</p>
                <p><strong>Size:</strong> {property.myhome_floor_area_value}</p>
                <p><strong>Distance from your location:</strong> {property.distance ? property.distance.toFixed(2) : 'N/A'} km</p> {/* Display distance */}
              </div>
            ))
          ) : (
            <p>No properties found.</p>
          )}
        </div>
      )}
    </div>
  );
}
