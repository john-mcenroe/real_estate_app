// page.js

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req) {
  try {
    const data = await req.json();
    console.log('Received data in API route:', data);

    return new Promise((resolve, reject) => {
      // Ensure the path to the Python script is correct
      const scriptPath = path.join(process.cwd(), 'app/api/generate_columns/generate_columns.py');
      console.log('Spawning Python process with script:', scriptPath);

      // Use 'python3' to ensure the correct Python version is used
      const pythonProcess = spawn('python3', [scriptPath], {
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        // Optionally, set a timeout (e.g., 10 seconds)
        // timeout: 10000,
      });

      let result = '';
      let error = '';

      // Capture standard output from the Python script
      pythonProcess.stdout.on('data', (data) => {
        console.log('Python stdout:', data.toString());
        result += data.toString();
      });

      // Capture standard error from the Python script
      pythonProcess.stderr.on('data', (data) => {
        console.error('Python stderr:', data.toString());
        error += data.toString();
      });

      // Handle process exit
      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        if (code !== 0) {
          console.error(`Python script error: ${error}`);
          reject(new Error(`Python script exited with code ${code}: ${error}`));
        } else {
          try {
            // Attempt to parse the Python script's output as JSON
            const parsedResult = JSON.parse(result);
            resolve(NextResponse.json(parsedResult));
          } catch (e) {
            console.error(`Failed to parse Python script output: ${result}`);
            reject(new Error(`Failed to parse Python script output: ${e.message}`));
          }
        }
      });

      // Send JSON data to the Python script via stdin
      pythonProcess.stdin.write(JSON.stringify(data));
      pythonProcess.stdin.end();
    });
  } catch (error) {
    console.error('Error in generate_columns API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
