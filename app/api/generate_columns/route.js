import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const body = await request.json();
    const scriptPath = path.join(process.cwd(), 'app', 'api', 'generate_columns', 'generate_columns.py');
    try {
      const { stdout, stderr } = await execAsync(`python "${scriptPath}" '${JSON.stringify(body)}'`);
      console.log("Python stdout:", stdout);
      console.log("Python stderr:", stderr);
      
      if (stderr) {
        console.error('Python script error:', stderr);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      const result = JSON.parse(stdout);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Python execution error:", error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error executing Python script:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
