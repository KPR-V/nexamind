import { NextRequest, NextResponse } from "next/server";
import { Document } from "llamaindex";
import { createQueryEngine } from "../../../../utils/agentutils/llamaIndexAgents";
import { Settings } from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import { OpenAIEmbedding } from "@llamaindex/openai";
import dotenv from "dotenv";
dotenv.config();
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (!Settings.llm && process.env.OPENAI_API_KEY) {
      Settings.llm = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
        temperature: 0.7,
      });

      Settings.embedModel = new OpenAIEmbedding({
        apiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
      });
    }

    const documents: Document[] = [];
    const docIds: string[] = [];

    for (const file of files) {
      const text = await file.text();
      const docId = `doc-${Date.now()}-${documents.length}`;
      docIds.push(docId);

      documents.push(
        new Document({
          text,
          metadata: {
            filename: file.name,
            filetype: file.type,
            filesize: file.size,
            source_id: docId,
          },
        })
      );
    }

    const queryEngine = await createQueryEngine(documents);

    return NextResponse.json({
      message: "Documents processed successfully",
      documentCount: documents.length,
      documentIds: docIds,
    });
  } catch (error) {
    console.error("Error processing documents:", error);
    return NextResponse.json(
      { error: "Failed to process documents" },
      { status: 500 }
    );
  }
}
