// /api/ollama/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

export async function GET(request: NextRequest) {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);

    const models = response.data.models || [];

    return NextResponse.json({
      models: models.map((model: any) => ({
        id: model.name,
        name: model.name,
        modified: model.modified_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching Ollama models:", error);
    return NextResponse.json(
      { error: "Failed to fetch Ollama models" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (data.action === "pull" && data.model) {
      // Pull a new model
      await axios.post(`${OLLAMA_URL}/api/pull`, {
        name: data.model,
      });

      return NextResponse.json({
        message: `Model ${data.model} pull initiated`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error with Ollama model action:", error);
    return NextResponse.json(
      { error: "Failed to perform model action" },
      { status: 500 }
    );
  }
}
