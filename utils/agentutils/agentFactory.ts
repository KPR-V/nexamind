import { agent, tool } from "llamaindex";
import { z } from "zod";
import { Document } from "llamaindex";
import {
  initializeLlamaIndex,
  createQueryEngine,
  chatWithLlamaAgent,
} from "./llamaIndexAgents";

type AgentTool = {
  name: string;
  description: string;
  execute: (input: any) => Promise<any>;
};

export function createCommonTools() {
  const websearch = tool({
    name: "web-search",
    description: "Perform web searches",
    parameters: z.object({
      query: z.string().describe("The search query"),
      numresults: z
        .number()
        .describe("Number of results to return (default: 9)"),
    }),
    execute: async ({ query, numresults = 9 }) => {
      const apiUrl = new URL("/api/execute-tool", getBaseUrl()).toString();

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool: "web-search",
          params: { query, numresults },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute web search");
      }

      const result = await response.json();
      return result.data || "No results found";
    },
  });

  return [websearch];
}

function getBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  }

  return window.location.origin;
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "web-search",
    description: "Perform web searches",
    execute: async ({ query, numresults = 9 }) => {
      const apiUrl = new URL("/api/execute-tool", getBaseUrl()).toString();

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool: "web-search",
          params: { query, numresults },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute web search");
      }

      const result = await response.json();
      return result.data || "No results found";
    },
  },
  {
    name: "image-generation",
    description: "Generate images",
    execute: async ({ model, prompt }) => {
      const apiUrl = new URL("/api/image/generate", getBaseUrl()).toString();

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const result = await response.json();
      return result.imageUrl || "Failed to generate image";
    },
  },
];

export async function executeAgentTask(
  taskType: string,
  input: any,
  documents?: Document[],
  options?: {
    provider?: string;
    modelName?: string;
    temperature?: number;
    tools?: string[];
  }
): Promise<any> {
  const provider = options?.provider || "openai";
  const modelName = options?.modelName || "gpt-4o-mini";
  const tools = options?.tools || [];
  const temperature = options?.temperature || 0.7;

  console.log(`Executing agent task: ${taskType}`, {
    provider,
    modelName,
    hasDocuments: documents && documents.length > 0,
    toolsCount: tools.length,
  });

  try {
    switch (taskType) {
      case "agent-chat":
      case "llama-chat":
        console.log("Executing chat with LlamaAgent:", {
          input:
            typeof input === "string"
              ? input.substring(0, 50) + "..."
              : "non-string input",
          documentCount: documents?.length || 0,
          provider,
        });

        const chatResult = await chatWithLlamaAgent(input, documents);
        if (!chatResult) {
          throw new Error("No response received from chat model");
        }
        return chatResult;

      case "web-search":
        console.log("Executing web search:", {
          query:
            typeof input === "string"
              ? input
              : input?.prompt || "unknown query",
        });

        const searchQuery =
          typeof input === "string" ? input : input?.prompt || input;
        const numResults =
          typeof input === "object" && input.numresults ? input.numresults : 5;

        const searchApiUrl = new URL(
          "/api/execute-tool",
          getBaseUrl()
        ).toString();

        const searchResponse = await fetch(searchApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tool: "search_web",
            parameters: { query: searchQuery, num_results: numResults },
          }),
        });

        if (!searchResponse.ok) {
          return "I couldn't find relevant information through web search. Please try a different query or approach.";
        }

        const searchResult = await searchResponse.json();

        if (searchResult.result && searchResult.result.results) {
          const results = searchResult.result.results;

          const formattedResults = results
            .map(
              (result: any, index: any) =>
                `[${index + 1}] ${result.title}\nURL: ${result.url}\n${
                  result.snippet
                }`
            )
            .join("\n\n");

          const prompt = `I searched the web for "${searchQuery}" and found the following information:
          
${formattedResults}

Based on these search results, please provide a comprehensive, well-organized response to the original query: "${searchQuery}". 
Cite specific information from the search results where appropriate.`;

          return await chatWithLlamaAgent(prompt);
        }

        return searchResult.result || "No relevant results found.";

      case "image-generation":
        const imgApiUrl = new URL(
          "/api/image/generate",
          getBaseUrl()
        ).toString();

        const imgResponse = await fetch(imgApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: input.model,
            prompt: input.prompt,
          }),
        });

        if (!imgResponse.ok) {
          throw new Error("Failed to generate image");
        }

        const imgResult = await imgResponse.json();
        return imgResult.imageUrl || "Failed to generate image";

      case "chat-completion":
        console.log("Executing chat completion:", {
          model: input.model || modelName,
          messageCount: Array.isArray(input.messages)
            ? input.messages.length
            : "using direct input",
        });

        const messages = input.messages || [{ role: "user", content: input }];
        return await chatWithLlamaAgent(messages, documents);

      case "rag-query":
        console.log("Executing RAG query:", {
          query:
            typeof input === "string"
              ? input.substring(0, 50) + "..."
              : "non-string input",
          documentCount: documents?.length || 0,
        });

        const queryResult = await chatWithLlamaAgent(input, documents);
        if (!queryResult) {
          return "I couldn't find relevant information in the provided documents. Please try a different query or provide more context.";
        }
        return queryResult;

      default:
        console.warn(
          `Unknown task type: ${taskType}, falling back to basic chat`
        );
        return await chatWithLlamaAgent(input, documents);
    }
  } catch (error) {
    console.error(`Error executing agent task (${taskType}):`, error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return "I couldn't process your request due to an API key issue. Please check your API configuration.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("connect")
      ) {
        return "I'm having trouble connecting to the required services. Please check your internet connection and try again.";
      } else {
        return `I encountered an issue while trying to respond: ${error.message}. Please try again with a different query.`;
      }
    }

    return "I'm having technical difficulties at the moment. Please try again later.";
  }
}

export async function createAgent(config: any) {
  const {
    type,
    modelName,
    temperature = 0.7,
    apiKey,
    tools = [],
    documents = [],
    useRAG = false,
    provider = "openai",
  } = config;

  if (provider === "openai" || provider === "ollama") {
    initializeLlamaIndex(apiKey, {
      modelProvider: provider,
      modelName,
      temperature,
    });
  }

  const commonTools = createCommonTools();

  switch (provider) {
    case "ollama":
    case "openai":
    default:
      let agentTools = [...commonTools];

      if (useRAG && documents.length > 0) {
        const queryEngine = await createQueryEngine(documents);

        const queryTool = tool({
          name: "document-query",
          description: "Query information from documents",
          parameters: z.object({
            query: z
              .string()
              .describe("The query to search for in the documents"),
          }),
          execute: async ({ query }) => {
            const response = await queryEngine.query({ query });
            return response.message.content;
          },
        });

        agentTools.push(queryTool);
      }

      const selectedExtraTools = tools
        .filter((toolName: any) => {
          const foundTool = AGENT_TOOLS.find((t) => t.name === toolName);
          return !!foundTool;
        })
        .map((toolName: any) => {
          const foundTool = AGENT_TOOLS.find((t) => t.name === toolName);
          return tool({
            name: foundTool?.name!,
            description: foundTool?.description!,
            parameters: z.object({
              input: z.any().describe("Input for the tool"),
            }),
            execute: async ({ input }) => foundTool?.execute(input),
          });
        });

      agentTools = [...agentTools, ...selectedExtraTools];

      return agent({
        tools: agentTools,
        verbose: config.verbose || false,
      });
  }
}

export function getAvailableTools() {
  return AGENT_TOOLS;
}
