import { NextRequest, NextResponse } from "next/server";
import { Document } from "llamaindex";
import { createQueryEngine } from "../../../../utils/agentutils/llamaIndexAgents";
import { Settings } from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import dotenv from "dotenv";
dotenv.config();
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.query || !data.documents) {
      return NextResponse.json(
        { error: "Missing query or documents" },
        { status: 400 }
      );
    }

    if (!Settings.llm && process.env.OPENAI_API_KEY) {
      Settings.llm = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
        temperature: 0.2,
      });
    }

    const documents = data.documents.map(
      (docData: any) =>
        new Document({
          text: docData.text,
          metadata: {
            ...docData.metadata,
            source_id: docData.id,
          },
        })
    );

    const queryEngine = await createQueryEngine(documents);

    const response = await queryEngine.query({
      query: data.query,
    });

    return NextResponse.json({
      result: response.message.content,
      sourceNodes: response.sourceNodes?.map((node) => ({
        id: node.node.id_,
        text: node.node.asRelatedNodeInfo(),
        score: node.score,
      })),
    });
  } catch (error) {
    console.error("Error executing RAG query:", error);
    return NextResponse.json(
      { error: "Failed to execute RAG query" },
      { status: 500 }
    );
  }
}
