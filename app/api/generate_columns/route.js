// page.js

import { NextResponse } from 'next/server';

const API_URL = process.env.GOOGLE_CLOUD_API_URL;

export async function POST(req) {
  try {
    const data = await req.json();
    console.log('Received data in /generate_columns API route:', JSON.stringify(data, null, 2));

    if (!API_URL) {
      throw new Error('GOOGLE_CLOUD_API_URL is not set in environment variables');
    }

    console.log('Sending request to:', API_URL);
    const response = await fetch(`${API_URL}/generate_columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).catch(error => {
      console.error('Fetch error:', error);
      throw new Error(`Fetch failed: ${error.message}`);
    });

    console.log('Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const resultText = await response.text();
    console.log('Raw response from Flask:', resultText);

    let result;
    try {
      result = JSON.parse(resultText);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      throw new Error(`Failed to parse JSON response: ${resultText}`);
    }

    console.log('Parsed result:', JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in generate_columns API route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
