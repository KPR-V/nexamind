import { NextResponse } from "next/server";
import { Settings } from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import { OpenAIEmbedding } from "@llamaindex/openai";
import dotenv from "dotenv";
dotenv.config();
export async function GET() {
  try {
    if (process.env.OPENAI_API_KEY) {
      Settings.llm = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
        temperature: 0.7,
      });

      Settings.embedModel = new OpenAIEmbedding({
        apiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
      });
    } else {
      throw new Error("OpenAI API key not found in environment variables");
    }

    return NextResponse.json({
      success: true,
      message: "LlamaIndex initialized successfully",
    });
  } catch (error) {
    console.error("Error initializing LlamaIndex:", error);
    return NextResponse.json(
      { error: "Failed to initialize LlamaIndex" },
      { status: 500 }
    );
  }
}
