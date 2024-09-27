'use client'; // Needed for client-side rendering

import { useSearchParams } from 'next/navigation'; // Hook to get the query params

export default function ResultPage() {
  const searchParams = useSearchParams(); // Use hook to get query parameters

  // Extract the latitude, longitude, and address from the query params
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const address = searchParams.get('address');

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
    </div>
  );
}
