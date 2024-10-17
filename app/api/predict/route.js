import { NextResponse } from "next/server";

const API_URL = process.env.GOOGLE_CLOUD_API_URL;

export async function POST(req) {
  try {
    const data = await req.json();
    console.log('Received data in /predict API route:', data);
    console.log('Sending data to Google Cloud Function:', JSON.stringify(data));

    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('Received result from Google Cloud Function:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /predict API route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
