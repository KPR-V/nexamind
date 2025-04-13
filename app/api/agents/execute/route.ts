import { NextResponse } from "next/server";
import { Document, VectorStoreIndex } from "llamaindex";
import { Settings } from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import { executeAgentTask } from "../../../../utils/agentutils/agentFactory";
import dotenv from "dotenv";
dotenv.config();

interface AgentRequest {
  taskType: string;
  input: any;
  documents?: any;
  agentOptions?: {
    provider: string;
    modelName: string;
    temperature: number;
    tools?: any;
  };
}

export async function POST(request: Request) {
  try {
    const requestData: AgentRequest = await request.json();
    const { taskType, input, documents, agentOptions } = requestData;

    console.log("Received agent execution request:", {
      taskType,
      input:
        typeof input === "string" ? input.substring(0, 100) + "..." : input,
      documentCount: documents?.length || 0,
      agentOptions,
    });

    const llm = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: agentOptions?.modelName || "gpt-4o-mini",
      temperature: agentOptions?.temperature || 0.7,
    });

    Settings.llm = llm;

    if (
      taskType === "rag-query" ||
      taskType === "web-search" ||
      taskType === "agent-chat"
    ) {
      const result = await executeAgentTask(taskType, input, documents, {
        provider: agentOptions?.provider || "openai",
        modelName: agentOptions?.modelName || "gpt-4o-mini",
        temperature: agentOptions?.temperature || 0.7,
        tools: agentOptions?.tools || [],
      });

      return NextResponse.json({ result });
    } else {
      const result = await performAgentTask(
        taskType,
        input,
        documents,
        agentOptions
      );

      return NextResponse.json({ result });
    }
  } catch (error: any) {
    console.error("Error in agent execution:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error occurred" },
      { status: 500 }
    );
  }
}

async function performAgentTask(
  taskType: string,
  input: any,
  documents?: any,
  options?: any
) {
  switch (taskType) {
    case "query":
    case "rag-query":
      return await handleRagQueryTask(input, documents, options);
    case "summarize":
      return await handleSummarizeTask(input, documents, options);
    case "extract":
      return await handleExtractTask(input, documents, options);
    default:
      throw new Error(`Unsupported task type: ${taskType}`);
  }
}

async function handleRagQueryTask(input: any, documents?: any, options?: any) {
  try {
    let llamaDocuments: any = [];
    if (documents && Array.isArray(documents)) {
      llamaDocuments = documents.map(
        (doc: any) =>
          new Document({
            text: doc.content || doc.text,
            metadata: doc.metadata,
          })
      );
    } else if (typeof input === "string") {
      llamaDocuments = [
        new Document({
          text: input,
        }),
      ];
    }

    const index = await VectorStoreIndex.fromDocuments(llamaDocuments);

    const queryEngine = index.asQueryEngine();

    const query = typeof input === "string" ? input : input.query;
    const response = await queryEngine.query({
      query,
    });

    return response.toString();
  } catch (error) {
    console.error("Error handling RAG query task:", error);
    throw error;
  }
}

async function handleSummarizeTask(input: any, documents?: any, options?: any) {
  try {
    const llamaDocuments = documents?.map(
      (doc: any) =>
        new Document({
          text: doc.content,
          metadata: doc.metadata,
        })
    );

    const index = await VectorStoreIndex.fromDocuments(
      llamaDocuments || [
        new Document({
          text: typeof input === "string" ? input : JSON.stringify(input),
        }),
      ]
    );

    const queryEngine = index.asQueryEngine();
    const summaryPrompt =
      "Please provide a comprehensive summary of the following text:";

    const response = await queryEngine.query({
      query: summaryPrompt,
    });

    return response.toString();
  } catch (error) {
    console.error("Error handling summarize task:", error);
    throw error;
  }
}

async function handleExtractTask(input: any, documents?: any, options?: any) {
  try {
    const textToProcess =
      input.text ||
      (typeof input === "string" ? input : "") ||
      documents?.[0]?.content ||
      "";

    const prompt = `Extract the following information from the text:
${input.fields ? input.fields.map((f: string) => `- ${f}`).join("\n") : ""}
Text: ${textToProcess}`;

    const llm = Settings.llm;
    const response = await llm.complete({
      prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error handling extract task:", error);
    throw error;
  }
}
