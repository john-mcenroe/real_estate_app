'use client'; // Enable client-side rendering

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../libs/supabaseClient'; // Adjust path to point to supabase client

export default function ResultPage() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Extract latitude, longitude, and address from query params
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const address = searchParams.get('address');

  // Fetch data from Supabase
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('scraped_property_data_v1')  // Your table name
          .select('*')                       // Select all columns
          .limit(10);                        // Limit to first 10 results

        if (error) {
          console.error('Error fetching data:', error.message);
        } else {
          setProperties(data);
        }
      } catch (error) {
        console.error('Error in Supabase query:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

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

      <h2 className="text-xl font-semibold mt-6">Property Results:</h2>

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
