import { NextResponse } from "next/server";
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req) {
  try {
    const data = await req.json();
    console.log('Received data in /predict API route:', data);

    // Before sending data to Python script
    console.log('Sending data to Python script:', JSON.stringify(data));

    return new Promise((resolve, reject) => {
      // Define the path to the Python script
      const scriptPath = path.join(process.cwd(), 'app/api/predict/predict.py');
      console.log('Spawning Python process with script:', scriptPath);

      // Spawn the Python process
      const pythonProcess = spawn('python3', [scriptPath], {
        env: {
          ...process.env,
          // Add any environment variables if needed
        },
      });

      let result = '';
      let error = '';

      // Capture stdout
      pythonProcess.stdout.on('data', (data) => {
        console.log('Python stdout:', data.toString());
        result += data.toString();
      });

      // Capture stderr
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
            const parsedResult = JSON.parse(result);
            resolve(NextResponse.json(parsedResult));
          } catch (e) {
            console.error(`Failed to parse Python script output: ${result}`);
            reject(new Error(`Failed to parse Python script output: ${e.message}`));
          }
        }
      });

      // Send JSON data to Python script via stdin
      pythonProcess.stdin.write(JSON.stringify(data));
      pythonProcess.stdin.end();

      // After receiving result from Python script
      console.log('Received result from Python script:', result);
    });
  } catch (error) {
    console.error('Error in /predict API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
