"use client";

import { useState, useEffect } from "react";
import { useAgent } from "../../../contexts/AgentContext";
import axios from "axios";
import { BaseAgent, LlamaAgent } from "../../../types/agent";

export default function AgentSelector() {
  const {
    agents,
    selectedAgent,
    selectedAgentsForTask,
    selectAgent,
    selectAgentForTask,
    removeAgentFromTask,
  } = useAgent();

  const [availableAgents, setAvailableAgents] = useState<LlamaAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentType, setNewAgentType] = useState("openai");
  const [newAgentModel, setNewAgentModel] = useState("gpt-4o-mini");
  const [newAgentRole, setNewAgentRole] = useState("");
  const [newAgentSpecialization, setNewAgentSpecialization] = useState("");
  const [newAgentTools, setNewAgentTools] = useState<string[]>([]);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/agents");
        setAvailableAgents(response.data.agents);
        if (response.data.tools) {
          setAvailableTools(response.data.tools);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
        setError("Failed to load available agents");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  useEffect(() => {
    if (newAgentType === "ollama") {
      fetch("/api/agents/ollama")
        .then((res) => res.json())
        .then((data) => {
          if (data.models) {
            setAvailableModels(data.models);
            if (data.models.length > 0) {
              setNewAgentModel(data.models[0].id);
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching Ollama models:", error);
          setAvailableModels([{ id: "llama2", name: "Llama 2" }]);
          setNewAgentModel("llama2");
        });
    } else {
      setAvailableModels([{ id: "gpt-4o-mini", name: "GPT-4o Mini" }]);
      setNewAgentModel("gpt-4o-mini");
    }
  }, [newAgentType]);

  const handleAgentClick = (agent: LlamaAgent) => {
    selectAgent(agent.id);
  };

  const toggleCollaborationPanel = () => {
    setShowCollaborationPanel(!showCollaborationPanel);
  };

  const handleAgentSelection = (agent: LlamaAgent) => {
    if (selectedAgentsForTask.some((a) => a.id === agent.id)) {
      removeAgentFromTask(agent.id);
    } else {
      selectAgentForTask(agent.id);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newAgentName,
          type: newAgentType,
          modelName: newAgentModel,
          role: newAgentRole,
          specialization: newAgentSpecialization,
          tools: newAgentTools,
        }),
      });

      if (!response.ok) throw new Error("Failed to create agent");

      const data = await response.json();

      setIsCreatingAgent(false);
      setNewAgentName("");
      setNewAgentType("openai");
      setNewAgentModel("gpt-4o-mini");
      setNewAgentRole("");
      setNewAgentSpecialization("");
      setNewAgentTools([]);

      window.location.reload();
    } catch (error) {
      console.error("Error creating agent:", error);
      alert("Failed to create agent. Please try again.");
    }
  };

  const toggleTool = (toolId: string) => {
    setNewAgentTools((prevTools) => {
      if (prevTools.includes(toolId)) {
        return prevTools.filter((id) => id !== toolId);
      } else {
        return [...prevTools, toolId];
      }
    });
  };

  const renderAgentCard = (
    agent: LlamaAgent,
    isSelected: boolean,
    onClick: () => void
  ) => (
    <div
      key={agent.id}
      className={`p-4 rounded-lg cursor-pointer mb-2 border ${
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium">{agent.name}</div>
        <div className="text-xs py-1 px-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          {agent.type}
        </div>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {agent.description}
      </div>
      {agent.specialization && (
        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
          Specialization: {agent.specialization}
        </div>
      )}
      {agent.role && (
        <div className="mt-1 text-xs text-green-600 dark:text-green-400">
          Role: {agent.role}
        </div>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        {agent.tools && agent.tools.length > 0 ? (
          agent.tools.map((tool) => (
            <span
              key={tool}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
            >
              {tool}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            No tools
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Select Agent</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsCreatingAgent(true)}
            className="text-xs bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded"
          >
            New Agent
          </button>
          <button
            onClick={toggleCollaborationPanel}
            className="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            {showCollaborationPanel ? "Single Agent" : "Collaboration"}
          </button>
        </div>
      </div>

      {isCreatingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Create New Agent</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                  placeholder="Agent Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Provider
                </label>
                <select
                  value={newAgentType}
                  onChange={(e) => setNewAgentType(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                >
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={newAgentModel}
                  onChange={(e) => setNewAgentModel(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                >
                  <option value="">No specific role</option>
                  <option value="researcher">Researcher</option>
                  <option value="writer">Writer</option>
                  <option value="analyst">Analyst</option>
                  <option value="programmer">Programmer</option>
                  <option value="translator">Translator</option>
                  <option value="summarizer">Summarizer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Specialization
                </label>
                <input
                  type="text"
                  value={newAgentSpecialization}
                  onChange={(e) => setNewAgentSpecialization(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                  placeholder="e.g., Python, marketing, finance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tools</label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
                  {availableTools.map((tool) => (
                    <div key={tool.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`tool-${tool.id}`}
                        checked={newAgentTools.includes(tool.id)}
                        onChange={() => toggleTool(tool.id)}
                        className="mr-2"
                      />
                      <label htmlFor={`tool-${tool.id}`} className="text-sm">
                        {tool.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsCreatingAgent(false)}
                className="py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAgent}
                disabled={!newAgentName.trim()}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Create Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div className="text-sm">Loading agents...</div>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-500 dark:text-red-400">
          {error}
        </div>
      ) : showCollaborationPanel ? (
        <div>
          <p className="text-sm mb-3 text-gray-600 dark:text-gray-300">
            Select multiple agents to collaborate on a task
          </p>
          <div className="mb-3">
            <div className="text-sm font-medium mb-1">
              Selected Agents ({selectedAgentsForTask.length})
            </div>
            {selectedAgentsForTask.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedAgentsForTask.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded"
                  >
                    <span>{agent.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAgentFromTask(agent.id);
                      }}
                      className="ml-1 text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm italic text-gray-500 dark:text-gray-400 mb-2">
                No agents selected
              </div>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {availableAgents.map((agent) =>
              renderAgentCard(
                agent,
                selectedAgentsForTask.some((a) => a.id === agent.id),
                () => handleAgentSelection(agent)
              )
            )}
          </div>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {availableAgents.map((agent) =>
            renderAgentCard(agent, selectedAgent?.id === agent.id, () =>
              handleAgentClick(agent)
            )
          )}
        </div>
      )}
    </div>
  );
}
