import { NextRequest, NextResponse } from "next/server";
import { Document } from "llamaindex";
import { executeAgentTask } from "../../../../utils/agentutils/agentFactory";
import dotenv from "dotenv";
dotenv.config();
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      message,
      agentId,
      documents,
      taskType,
      provider,
      modelName,
      tools,
      temperature,
    } = data;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    let llamaDocuments: Document[] | undefined = undefined;
    if (documents && Array.isArray(documents)) {
      llamaDocuments = documents.map(
        (doc: any) =>
          new Document({
            text: doc.text,
            metadata: {
              ...doc.metadata,
              source_id: doc.id,
            },
          })
      );
    }

    const finalTaskType =
      taskType || (llamaDocuments?.length ? "rag-query" : "agent-chat");

    const apiKey =
      provider === "openai"
        ? process.env.OPENAI_API_KEY
        : provider === "ollama"
        ? process.env.OLLAMA_API_KEY
        : null;

    const response = await executeAgentTask(
      finalTaskType,
      message,
      llamaDocuments,
      {
        provider: provider || "openai",
        modelName,
        temperature,
        tools,
      }
    );

    return NextResponse.json({
      response,
      agentId,
      taskType: finalTaskType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error interacting with agent:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get response from agent",
      },
      { status: 500 }
    );
  }
}
