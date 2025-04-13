"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { LlamaAgent } from "../types/agent";
import { Document } from "llamaindex";

type AgentContextType = {
  agents: LlamaAgent[];
  selectedAgent: LlamaAgent | null;
  selectedAgentsForTask: LlamaAgent[];
  messages: any[];
  documents: Document[];
  isProcessing: boolean;
  lastResult: any;
  addMessage: (message: any) => void;
  sendMessage: (content: string) => Promise<void>;
  selectAgent: (agentId: string) => void;
  selectAgentForTask: (agentId: string) => void;
  removeAgentFromTask: (agentId: string) => void;
  addDocument: (document: Document) => void;
  clearDocuments: () => void;
  executeTask: (taskType: string, input: any) => Promise<any>;
  executeCollaborativeTask: (taskType: string, input: any) => Promise<any>;
};

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<LlamaAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<LlamaAgent | null>(null);
  const [selectedAgentsForTask, setSelectedAgentsForTask] = useState<
    LlamaAgent[]
  >([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const userId = "user-" + Math.random().toString(36).substring(2, 9);

  useEffect(() => {
    axios.get("/api/agents/initialize").catch((error) => {
      console.error("Error initializing LlamaIndex:", error);
    });

    axios
      .get("/api/agents")
      .then((response) => {
        setAgents(response.data.agents);
      })
      .catch((error) => {
        console.error("Error fetching agents:", error);
      });
  }, []);

  const selectAgent = async (agentId: string) => {
    try {
      setIsProcessing(true);

      const agent = agents.find((a) => a.id === agentId);
      if (!agent) {
        throw new Error("Agent not found");
      }

      await axios.post("/api/agents/select", {
        userId,
        agent,
      });

      setSelectedAgent(agent);

      setMessages([
        {
          role: "system",
          content: `You are ${agent.name}, an ${
            agent.type === "openai" ? "OpenAI" : "Ollama"
          } powered assistant.${
            agent.role ? ` Your role is to be a ${agent.role}.` : ""
          }${
            agent.specialization
              ? ` You specialize in ${agent.specialization}.`
              : ""
          }`,
        },
      ]);
    } catch (error) {
      console.error("Error selecting agent:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectAgentForTask = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    if (!selectedAgentsForTask.some((a) => a.id === agentId)) {
      setSelectedAgentsForTask((prev) => [...prev, agent]);
    }
  };

  const removeAgentFromTask = (agentId: string) => {
    setSelectedAgentsForTask((prev) =>
      prev.filter((agent) => agent.id !== agentId)
    );
  };

  const addMessage = (message: any) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const sendMessage = async (content: string) => {
    if (!selectedAgent || !content.trim()) return;

    try {
      setIsProcessing(true);

      const userMessage = { role: "user", content };
      addMessage(userMessage);

      const payload = {
        message: content,
        agentId: selectedAgent.id,
        documents:
          documents.length > 0
            ? documents.map((doc) => ({
                text: doc.text,
                id: doc.id_,
                metadata: doc.metadata,
              }))
            : undefined,
        provider: selectedAgent.type,
        modelName: selectedAgent.modelName,
        tools: selectedAgent.tools,
        temperature: selectedAgent.temperature,
      };

      const response = await axios.post("/api/agents/interact", payload);

      addMessage({
        role: "assistant",
        content: response.data.response,
      });

      return response.data.response;
    } catch (error) {
      console.error("Error sending message:", error);
      addMessage({
        role: "system",
        content:
          "I'm sorry, there was an error processing your request. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const addDocument = (doc: Document) => {
    setDocuments((prevDocs) => [...prevDocs, doc]);
  };

  const clearDocuments = () => {
    setDocuments([]);
  };

  const executeTask = async (taskType: string, input: any) => {
    if (!selectedAgent) throw new Error("No agent selected");

    try {
      setIsProcessing(true);

      const payload = {
        taskType,
        input,
        provider: selectedAgent.type,
        modelName: selectedAgent.modelName,
        tools: selectedAgent.tools,
        temperature: selectedAgent.temperature,
        documents:
          documents.length > 0
            ? documents.map((doc) => ({
                text: doc.text,
                id: doc.id_,
                metadata: doc.metadata,
              }))
            : undefined,
      };

      const response = await axios.post("/api/agents/tasks", payload);

      setLastResult(response.data.result);
      return response.data.result;
    } catch (error) {
      console.error("Error executing task:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const executeCollaborativeTask = async (taskType: string, input: any) => {
    if (selectedAgentsForTask.length === 0) {
      throw new Error("No agents selected for collaboration");
    }

    try {
      setIsProcessing(true);

      const payload = {
        taskId: `task-${Date.now()}`,
        taskType,
        input: typeof input === "string" ? input : input.prompt || input,
        agents: selectedAgentsForTask,
        documents:
          documents.length > 0
            ? documents.map((doc) => ({
                text: doc.text,
                id: doc.id_,
                metadata: doc.metadata,
              }))
            : undefined,
      };

      const response = await axios.post(
        "/api/agents/collaborative-execute",
        payload
      );

      const result = {
        result: response.data.result,
        subtasks: response.data.subtasks,
        plan: response.data.plan,
      };

      setLastResult(result);
      return result;
    } catch (error) {
      console.error("Error executing collaborative task:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AgentContext.Provider
      value={{
        agents,
        selectedAgent,
        selectedAgentsForTask,
        messages,
        documents,
        isProcessing,
        lastResult,
        addMessage,
        sendMessage,
        selectAgent,
        selectAgentForTask,
        removeAgentFromTask,
        addDocument,
        clearDocuments,
        executeTask,
        executeCollaborativeTask,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
