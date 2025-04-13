import { OpenAI } from "@llamaindex/openai";
import { OpenAIEmbedding } from "@llamaindex/openai";
import { Document, VectorStoreIndex, SummaryIndex, Settings } from "llamaindex";
import { storageContextFromDefaults } from "llamaindex";
import { Ollama, OllamaEmbedding } from "@llamaindex/ollama";

export function initializeLlamaIndex(apiKey: string, options: any = {}) {
  const {
    modelProvider = "openai",
    modelName = undefined,
    temperature = 0.5,
  } = options;

  if (modelProvider === "openai") {
    Settings.llm = new OpenAI({
      model: modelName || "gpt-4o-mini",
      apiKey: apiKey,
      temperature: temperature,
    });

    Settings.embedModel = new OpenAIEmbedding({
      model: "text-embedding-3-small",
      apiKey: apiKey,
    });
  } else if (modelProvider === "ollama") {
    Settings.llm = new Ollama({
      model: modelName || "llama2:latest",
    });

    Settings.embedModel = new OllamaEmbedding({
      model: "nomic-embed-text:latest",
    });
  }

  return Settings.llm;
}

export async function createQueryEngine(documents?: Document[]) {
  const storageContext = await storageContextFromDefaults({});
  const docs = documents || [];
  const index = await VectorStoreIndex.fromDocuments(docs, { storageContext });
  return index.asQueryEngine();
}

export async function createChatEngine(documents?: Document[]) {
  const storageContext = await storageContextFromDefaults({});
  const docs = documents || [];
  const index = await SummaryIndex.fromDocuments(docs, { storageContext });
  return index.asChatEngine();
}

export async function chatWithLlamaAgent(
  message: string,
  documents?: Document[]
) {
  try {
    console.log(
      "Starting chatWithLlamaAgent with message:",
      typeof message === "string"
        ? message.substring(0, 100) + (message.length > 100 ? "..." : "")
        : "Non-string input",
      `Documents: ${documents?.length || 0}`
    );

    if (!Settings.llm) {
      console.warn(
        "LLM not initialized in chatWithLlamaAgent, initializing with default settings"
      );

      if (!process.env.OPENAI_API_KEY) {
        console.error(
          "No OpenAI API key found in environment when trying to initialize LLM"
        );
        return "I'm unable to process your request because the API key is missing. Please check your configuration.";
      }

      Settings.llm = new OpenAI({
        model: "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY,
        temperature: 0.7,
      });
    }

    const queryEngine = await createQueryEngine(documents);

    const response = await queryEngine.query({
      query: typeof message === "string" ? message : JSON.stringify(message),
    });

    if (!response || !response.message || !response.message.content) {
      console.warn("Received empty response from LlamaIndex queryEngine");
      return "I'm sorry, but I couldn't generate a response. Please try again with a different question.";
    }

    console.log(
      "Chat response received:",
      typeof response.message.content === "string"
        ? response.message.content.substring(0, 100) + "..."
        : "Non-string response"
    );

    return response.message.content;
  } catch (error) {
    console.error("Error in LlamaIndex chat:", error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return "I'm having trouble accessing my knowledge. Please check if the API key is correctly configured.";
      } else if (
        error.message.includes("timeout") ||
        error.message.includes("network")
      ) {
        return "I encountered a network issue while processing your request. Please check your internet connection and try again.";
      } else if (error.message.includes("rate limit")) {
        return "I've reached the usage limit for API calls. Please try again in a moment.";
      } else {
        return `I encountered an issue while processing your request: ${error.message}. Please try again or try a different question.`;
      }
    }

    return "I'm having technical difficulties at the moment. Please try again later.";
  }
}
