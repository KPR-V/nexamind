import { NextRequest, NextResponse } from "next/server";
import { getAvailableTools } from "../../../utils/agentutils/agentFactory";
import dotenv from "dotenv";
dotenv.config();

const AGENT_TEMPLATES = [
  {
    id: "agent-research",
    name: "Research Assistant",
    description: "Helps with research tasks and summarizing information",
    type: "openai",
    modelName: "gpt-4o-mini",
    temperature: 0.2,
    tools: ["web-search"],
  },
  {
    id: "agent-creative",
    name: "Creative Writer",
    description: "Assists with creative writing and content generation",
    type: "openai",
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  },
  {
    id: "agent-ollama",
    name: "Local AI Assistant",
    description: "Uses Ollama for local AI processing",
    type: "ollama",
    modelName: "llama2",
    temperature: 0.5,
  },
];

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      agents: AGENT_TEMPLATES,
      tools: getAvailableTools(),
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.name || !data.type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (data.type !== "openai" && data.type !== "ollama") {
      return NextResponse.json(
        { error: "Invalid agent type. Must be 'openai' or 'ollama'" },
        { status: 400 }
      );
    }

    const newAgent = {
      id: `agent-${Date.now()}`,
      name: data.name,
      description: data.description || "",
      type: data.type,
      modelName:
        data.modelName || (data.type === "openai" ? "gpt-4o-mini" : "llama2"),
      temperature: data.temperature || 0.7,
      maxTokens: data.maxTokens || 1500,
      tools: data.tools || [],
    };
    return NextResponse.json({ agent: newAgent });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
