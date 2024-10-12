import { NextResponse } from "next/server";
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req) {
  const body = await req.json();

  if (!body.beds || !body.baths || !body.size) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { beds, baths, size } = body;
    const { stdout } = await execAsync(`python src/modelling/predict.py ${beds} ${baths} ${size}`);
    
    const prediction = parseFloat(stdout.trim());
    
    return NextResponse.json({ prediction });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

