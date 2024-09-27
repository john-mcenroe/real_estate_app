import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req) {
  try {
    const { address } = await req.json();
    
    if (!address) {
      return NextResponse.json({ message: 'Address is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

    console.log(`Requesting geocode for address: ${address}`);

    const response = await axios.get(baseUrl, {
      params: {
        address,
        key: apiKey,
      },
    });

    // Log the full response for inspection
    console.log('Geocode API full response:', response.data);

    const results = response.data;

    if (results.status === 'OK' && results.results.length > 0) {
      const location = results.results[0].geometry.location;
      console.log('Extracted Lat:', location.lat, 'Extracted Lng:', location.lng);

      return NextResponse.json({
        lat: location.lat,
        lng: location.lng,
        address: results.results[0].formatted_address,
      });
    } else if (results.status === 'ZERO_RESULTS') {
      return NextResponse.json({ message: 'No results found for the given address' }, { status: 404 });
    } else {
      return NextResponse.json({ message: `Geocoding error: ${results.status}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching geolocation data:', error.message);
    console.error('Full error object:', error); // Log full error object for more details
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
