import { NextResponse } from "next/server";
import { Document, Settings } from "llamaindex";
import { OpenAI } from "@llamaindex/openai";
import { Ollama } from "@llamaindex/ollama";
import { executeAgentTask } from "../../../../utils/agentutils/agentFactory";
import { executeWorkflow } from "../../../../utils/agentutils/orchestrator";
import dotenv from "dotenv";
dotenv.config();

interface AgentForTask {
  id: string;
  name: string;
  type: string;
  role?: string;
  specialization?: string;
  modelName: string;
  temperature?: number;
  tools?: string[];
  enableWebSearch?: boolean;
}

interface SubtaskResult {
  agentId: string;
  agentName: string;
  role?: string;
  specialization?: string;
  input: string;
  output: string;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { taskId, taskType, input, documents, agents } = data;

    if (!taskType || !input || !agents || !Array.isArray(agents)) {
      return NextResponse.json(
        { error: "Missing required fields for collaborative task" },
        { status: 400 }
      );
    }

    if (agents.length === 0) {
      return NextResponse.json(
        { error: "At least one agent is required for collaboration" },
        { status: 400 }
      );
    }

    Settings.llm = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
      temperature: 0.2,
    });

    console.log(`Starting collaborative task with ${agents.length} agents`);

    let llamaDocuments: Document[] = [];
    if (documents && Array.isArray(documents)) {
      llamaDocuments = documents.map(
        (doc: any) =>
          new Document({
            text: doc.text || doc.content,
            metadata: doc.metadata,
          })
      );
    }

    const decompositionPrompt = `You are a task orchestrator. Break down the following task into specific subtasks that can be assigned to specialized agents.
Task: ${input}

For context, you have these specialized agents available:
${agents
  .map(
    (agent: AgentForTask) =>
      `- ${agent.name}: ${agent.role || "General assistant"} ${
        agent.specialization ? `specializing in ${agent.specialization}` : ""
      }`
  )
  .join("\n")}

Return a JSON object with:
1. An array of subtasks, each with:
   - description: A clear description of the subtask
   - agentId: The ID of the agent best suited for this subtask (choose from: ${agents
     .map((a) => a.id)
     .join(", ")})
   - reasoning: Why this agent is suitable for this subtask
2. A plan for how to combine the results

Format your response as a valid JSON object with 'subtasks' and 'plan' properties.`;

    const decompositionResult = await executeAgentTask(
      "agent-chat",
      decompositionPrompt,
      [],
      {
        provider: "openai",
        modelName: "gpt-4o-mini",
        temperature: 0.2,
      }
    );

    let subtasks = [];
    let plan = "";
    try {
      const jsonMatch =
        decompositionResult.match(/```json\n([\s\S]*?)\n```/) ||
        decompositionResult.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsedResult = JSON.parse(
          jsonMatch[0].replace(/```json\n|```/g, "").trim()
        );
        subtasks = parsedResult.subtasks || [];
        plan = parsedResult.plan || "Combine all results sequentially.";
      } else {
        subtasks = agents.map((agent: AgentForTask) => ({
          description: `Analyze the following task from your perspective as a ${
            agent.role || "general assistant"
          }: ${input}`,
          agentId: agent.id,
          reasoning: `Using ${agent.name}'s expertise for general analysis.`,
        }));
        plan = "Combine all results and synthesize a comprehensive response.";
      }
    } catch (error) {
      console.error("Error parsing decomposition result:", error);

      subtasks = agents.map((agent: AgentForTask) => ({
        description: `Analyze the following task from your perspective as a ${
          agent.role || "general assistant"
        }: ${input}`,
        agentId: agent.id,
        reasoning: `Using ${agent.name}'s expertise for general analysis.`,
      }));
      plan = "Combine all results and synthesize a comprehensive response.";
    }

    const subtaskResults: SubtaskResult[] = [];
    for (const subtask of subtasks) {
      const agent = agents.find((a: AgentForTask) => a.id === subtask.agentId);
      if (!agent) {
        console.warn(
          `Agent with ID ${subtask.agentId} not found. Skipping subtask.`
        );
        continue;
      }

      if (agent.type === "openai") {
        Settings.llm = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          model: agent.modelName || "gpt-4o-mini",
          temperature: agent.temperature || 0.7,
        });
      } else if (agent.type === "ollama") {
        Settings.llm = new Ollama({
          model: agent.modelName || "llama2",
        });
      }

      try {
        const shouldEnableWebSearch =
          agent.enableWebSearch ||
          agent.name.toLowerCase().includes("research") ||
          (agent.role && agent.role.toLowerCase().includes("research"));

        let agentTools = agent.tools || [];

        if (shouldEnableWebSearch && !agentTools.includes("web-search")) {
          agentTools = [...agentTools, "web-search"];
          console.log(`Enabling web search for ${agent.name}`);
        }

        const subtaskPrompt = `You are ${agent.name}, ${
          agent.role ? `a ${agent.role}` : "an AI assistant"
        }${
          agent.specialization ? ` specializing in ${agent.specialization}` : ""
        }.

Your task: ${subtask.description}

The overall task is: ${input}

${
  llamaDocuments.length > 0
    ? "You have access to relevant documents for context."
    : ""
}
${
  shouldEnableWebSearch
    ? "You have access to a web search tool. USE IT to find the most up-to-date information relevant to the task. When using the web search tool, be specific with your search queries."
    : ""
}

${
  agent.name.toLowerCase().includes("research")
    ? "When researching, make sure to use the web search tool to gather the most recent and relevant information. Search for specific facts, latest updates, or credible sources."
    : ""
}

Provide a detailed and thoughtful response based on your expertise.`;

        const subtaskResult = await executeAgentTask(
          "agent-chat",
          subtaskPrompt,
          llamaDocuments,
          {
            provider: agent.type,
            modelName: agent.modelName,
            temperature: agent.temperature,
            tools: agentTools,
          }
        );

        subtaskResults.push({
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          specialization: agent.specialization,
          input: subtask.description,
          output: subtaskResult,
        });
      } catch (error) {
        console.error(`Error executing subtask for agent ${agent.id}:`, error);
        subtaskResults.push({
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          specialization: agent.specialization,
          input: subtask.description,
          output: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }

    Settings.llm = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
      temperature: 0.2,
    });

    const synthesisPrompt = `You are a task orchestrator. You need to synthesize the results from multiple agents who worked on different aspects of a task.

Original task: ${input}

Plan: ${plan}

Results from specialized agents:
${subtaskResults
  .map(
    (result, index) =>
      `--- Agent ${index + 1}: ${result.agentName} ${
        result.role
          ? `(${result.role}${
              result.specialization
                ? ` specializing in ${result.specialization}`
                : ""
            })`
          : ""
      }
Subtask: ${result.input}
Result: ${result.output}
`
  )
  .join("\n")}

Please synthesize these results into a coherent, comprehensive response that addresses the original task. Integrate insights from all agents, resolve any contradictions, and ensure the final answer is complete and well-structured.`;

    const finalResult = await executeAgentTask(
      "agent-chat",
      synthesisPrompt,
      [],
      {
        provider: "openai",
        modelName: "gpt-4o-mini",
        temperature: 0.3,
      }
    );

    const processedResult =
      finalResult && finalResult.trim() && finalResult !== "Empty Response"
        ? finalResult
        : subtaskResults.length > 0
        ? `Here's a compilation of the agent findings:\n\n${subtaskResults
            .map(
              (result) =>
                `${result.agentName} (${result.role || "Assistant"}):\n${
                  result.output
                }`
            )
            .join("\n\n")}`
        : "Unable to synthesize results. Please try again with a more specific query.";

    return NextResponse.json({
      result: processedResult,
      subtasks: subtaskResults,
      plan: plan,
    });
  } catch (error) {
    console.error("Error in collaborative execution:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during collaborative execution",
      },
      { status: 500 }
    );
  }
}
