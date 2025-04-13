"use client";
import { useState, useEffect } from "react";
import { useAgent } from "../../contexts/AgentContext";
import AgentWorkspace from "./components/AgentWorkspace";
import axios from "axios";

export default function AgentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { agents } = useAgent();

  useEffect(() => {
    let isMounted = true;

    async function setupAgentEnvironment() {
      try {
        await axios.get("/api/agents/initialize");
      } catch (error) {
        console.error("Error setting up agent environment:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    setupAgentEnvironment();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (agents.length > 0) {
      setIsLoading(false);
    }
  }, [agents]);

  return (
    <div className="h-full transition-all duration-300 bg-zinc-900">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
            </div>
            <p className="text-zinc-400">Loading Agent Environment...</p>
          </div>
        </div>
      ) : (
        <div className="h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">
              Agents Arena
            </h1>
            <p className="text-zinc-400">
              Create, configure, and interact with specialized AI agents
            </p>
          </div>
          <div className="flex-1">
            <AgentWorkspace />
          </div>
        </div>
      )}
    </div>
  );
}
