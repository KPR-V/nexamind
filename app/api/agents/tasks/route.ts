import { NextRequest, NextResponse } from "next/server";
import { executeAgentTask } from "../../../../utils/agentutils/agentFactory";
import { Document } from "llamaindex";
import { Settings } from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import dotenv from "dotenv";
dotenv.config();
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.taskType || !data.input) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Settings.llm && process.env.OPENAI_API_KEY) {
      Settings.llm = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: data.modelName || "gpt-4o-mini",
        temperature: data.temperature || 0.7,
      });
    }

    let documents: Document[] | undefined;
    if (data.documents && Array.isArray(data.documents)) {
      documents = data.documents.map(
        (docData: any) =>
          new Document({
            text: docData.text,
            metadata: {
              ...docData.metadata,
              source_id: docData.id,
            },
          })
      );
    }

    const apiKey =
      data.provider === "openai"
        ? process.env.OPENAI_API_KEY
        : data.provider === "ollama"
        ? process.env.OLLAMA_API_KEY
        : null;

    const result = await executeAgentTask(
      data.taskType,
      data.input,
      documents,
      {
        provider: data.provider || "openai",
        modelName: data.modelName,
        temperature: data.temperature,
        tools: data.tools,
      }
    );

    return NextResponse.json({
      taskId: `task-${Date.now()}`,
      result,
      status: "completed",
    });
  } catch (error) {
    console.error("Error executing task:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        status: "failed",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const taskId = searchParams.get("id");

  if (!taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  try {
    return NextResponse.json({
      task: {
        id: taskId,
        status: "completed",
        result: "Task result would be fetched from database",
        created: new Date().toISOString(),
        completed: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}
