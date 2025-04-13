import { NextRequest, NextResponse } from "next/server";
import { LlamaAgent } from "../../../../types/agent";
import { Settings } from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import { OpenAIEmbedding } from "@llamaindex/openai";
import { Ollama, OllamaEmbedding } from "@llamaindex/ollama";
import dotenv from "dotenv";
dotenv.config();

const selectedAgents = new Map<string, LlamaAgent>();

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const agent = selectedAgents.get(userId);

    if (!agent) {
      return NextResponse.json(
        { message: "No agent selected for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Error fetching selected agent:", error);
    return NextResponse.json(
      { error: "Failed to get selected agent" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, agent } = data;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!agent) {
      selectedAgents.delete(userId);
      return NextResponse.json({ message: "Agent selection cleared" });
    }

    if (agent.type === "openai" && process.env.OPENAI_API_KEY) {
      Settings.llm = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: agent.modelName || "gpt-4o-mini",
        temperature: agent.temperature || 0.7,
      });

      Settings.embedModel = new OpenAIEmbedding({
        apiKey: process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
      });
    } else if (agent.type === "ollama") {
      Settings.llm = new Ollama({
        model: agent.modelName || "llama2",
        config: { baseUrl: process.env.OLLAMA_URL || "http://localhost:11434" },
      });

      Settings.embedModel = new OllamaEmbedding({
        model: "nomic-embed-text",
        config: { baseUrl: process.env.OLLAMA_URL || "http://localhost:11434" },
      });
    }

    const llamaAgent: LlamaAgent = {
      id: agent.id || `agent-${Date.now()}`,
      name: agent.name,
      description: agent.description || "",
      type: agent.type || "openai",
      modelName:
        agent.modelName || (agent.type === "openai" ? "gpt-4o-mini" : "llama2"),
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 1500,
      tools: agent.tools || [],
    };

    selectedAgents.set(userId, llamaAgent);

    return NextResponse.json({
      message: "Agent selected successfully",
      agent: llamaAgent,
    });
  } catch (error) {
    console.error("Error selecting agent:", error);
    return NextResponse.json(
      { error: "Failed to select agent" },
      { status: 500 }
    );
  }
}
