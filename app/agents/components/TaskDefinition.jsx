"use client";

import { useState, useEffect } from "react";
import { useAgent } from "../../../contexts/AgentContext";
import axios from "axios";

export default function TaskDefinition() {
  const {
    selectedAgent,
    selectedAgentsForTask,
    executeTask,
    executeCollaborativeTask,
    isProcessing,
    lastResult,
  } = useAgent();

  const [taskType, setTaskType] = useState("llama-chat");
  const [taskInput, setTaskInput] = useState("");
  const [modelOptions, setModelOptions] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [enableTools, setEnableTools] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [submittedTasks, setSubmittedTasks] = useState([]);
  const [pollingTasks, setPollingTasks] = useState({});
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState({});

  useEffect(() => {
    const fetchModels = async () => {
      if (taskType === "image-gen") {
        try {
          const response = await axios.get("/api/image/models");
          console.log("Image models response:", response.data.data.models);
          setModelOptions(response.data.data.models);
          setSelectedModel(response.data.data.models[0]);
        } catch (error) {
          console.error("Error fetching image models:", error);
        }
      } else if (taskType === "llm-inference") {
        const llms = [{ id: "gpt-4o-mini", name: "GPT-4o-mini" }];
        setModelOptions(llms);
        setSelectedModel(llms[0].id);
      }
    };

    fetchModels();
  }, [taskType]);

  useEffect(() => {
    const taskIds = Object.keys(pollingTasks);
    if (taskIds.length === 0) return;

    const intervalId = setInterval(async () => {
      for (const taskId of taskIds) {
        try {
          const response = await axios.get(`/api/agents/tasks?id=${taskId}`);

          if (
            response.data.task.status === "completed" ||
            response.data.task.status === "failed"
          ) {
            setSubmittedTasks((prev) =>
              prev.map((task) =>
                task.id === taskId ? { ...task, ...response.data.task } : task
              )
            );

            setPollingTasks((prev) => {
              const newPolling = { ...prev };
              delete newPolling[taskId];
              return newPolling;
            });
          }
        } catch (error) {
          console.error("Error polling task", taskId, error);
        }
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [pollingTasks]);

  useEffect(() => {
    setIsCollaborativeMode(selectedAgentsForTask.length > 0);
  }, [selectedAgentsForTask]);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    try {
      let formattedInput = taskInput;
      let taskResult;

      if (taskType === "image-gen") {
        formattedInput = {
          model: selectedModel,
          prompt: taskInput,
        };
      } else if (taskType === "llm-inference") {
        formattedInput = {
          model: selectedModel,
          prompt: taskInput,
          enableTools,
          enableWebSearchForNonToolModels: enableWebSearch,
          conversation: {},
        };
      }

      if (isCollaborativeMode && taskType !== "image-gen") {
        taskResult = await executeCollaborativeTask(taskType, formattedInput);
      } else {
        taskResult = await executeTask(taskType, formattedInput);
      }

      const newTask = {
        id: `task-${Date.now()}`,
        type: taskType,
        input: taskInput,
        status: "completed",
        result: taskResult,
        isCollaborative: isCollaborativeMode,
        created: new Date().toISOString(),
        completed: new Date().toISOString(),
      };

      setSubmittedTasks((prev) => [newTask, ...prev]);

      setTaskInput("");
    } catch (error) {
      console.error("Error submitting task:", error);

      setSubmittedTasks((prev) => [
        {
          id: `task-${Date.now()}`,
          type: taskType,
          input: taskInput,
          status: "failed",
          error: error.message || "Unknown error",
          isCollaborative: isCollaborativeMode,
          created: new Date().toISOString(),
          completed: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const toggleSubtasks = (taskId) => {
    setShowSubtasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const renderTaskInputOptions = () => {
    switch (taskType) {
      case "llama-chat":
      case "rag-query":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prompt</label>
              <textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Enter your question or prompt"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 min-h-20"
              />
            </div>
          </div>
        );

      case "web-search":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Search Query
              </label>
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Enter search query"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              />
            </div>
          </div>
        );

      case "image-gen":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              >
                {modelOptions.map((model, index) => (
                  <option key={index}>{model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Image Prompt
              </label>
              <textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Describe the image you want to generate"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 min-h-20"
              />
            </div>
          </div>
        );

      case "llm-inference":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              >
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prompt</label>
              <textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Enter your prompt"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 min-h-20"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enable-tools"
                  checked={enableTools}
                  onChange={(e) => setEnableTools(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="enable-tools" className="text-sm">
                  Enable Tools
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enable-web-search"
                  checked={enableWebSearch}
                  onChange={(e) => setEnableWebSearch(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="enable-web-search" className="text-sm">
                  Enable Web Search
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Define Task</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Task Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              >
                <option value="llama-chat">Chat with Agent</option>
                <option value="rag-query">Document Query (RAG)</option>
                <option value="web-search">Web Search</option>
                <option value="image-gen">Image Generation</option>
              </select>
            </div>

            {isCollaborativeMode && taskType !== "image-gen" && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-500 mr-2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    Collaborative Mode
                  </span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Your task will be processed by {selectedAgentsForTask.length}{" "}
                  selected agents working together.
                </p>
              </div>
            )}

            {renderTaskInputOptions()}

            <div>
              <button
                onClick={handleTaskSubmit}
                disabled={!taskInput.trim() || isProcessing}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing
                  ? "Processing..."
                  : `Submit ${isCollaborativeMode ? "Collaborative " : ""}Task`}
              </button>
            </div>
          </div>
        </div>

        {submittedTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Task Results</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {submittedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border ${
                    task.status === "completed"
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/10"
                      : task.status === "failed"
                      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10"
                      : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/10"
                  }`}
                >
                  <div className="flex justify-between mb-2">
                    <div className="font-medium flex items-center">
                      {task.type === "llama-chat"
                        ? "Chat"
                        : task.type === "rag-query"
                        ? "Document Query"
                        : task.type === "web-search"
                        ? "Web Search"
                        : task.type === "image-gen"
                        ? "Image Generation"
                        : "Custom LLM"}

                      {task.isCollaborative && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                          Collaborative
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      {task.status === "completed" ? (
                        <span className="text-green-600 dark:text-green-400">
                          Completed
                        </span>
                      ) : task.status === "failed" ? (
                        <span className="text-red-600 dark:text-red-400">
                          Failed
                        </span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Processing
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {typeof task.input === "string"
                      ? task.input
                      : "Complex input"}
                  </div>

                  {task.status === "completed" && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                      {task.type === "image-gen" ? (
                        <div className="flex justify-center">
                          <img
                            src={task.result}
                            alt="Generated"
                            className="max-h-48 object-contain"
                          />
                        </div>
                      ) : task.isCollaborative &&
                        typeof task.result === "object" ? (
                        <div className="space-y-3">
                          {task.result.plan && (
                            <>
                              <div className="text-sm font-medium mb-1">
                                Task Plan:
                              </div>
                              <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                {task.result.plan}
                              </div>
                            </>
                          )}

                          <div className="text-sm font-medium mb-1">
                            Final Result:
                          </div>
                          <div className="whitespace-pre-wrap text-sm">
                            {task.result.result || "No result data available."}
                          </div>

                          {task.result.subtasks &&
                            task.result.subtasks.length > 0 && (
                              <div className="mt-3">
                                <button
                                  onClick={() => toggleSubtasks(task.id)}
                                  className="flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                  <svg
                                    className={`w-4 h-4 mr-1 transition-transform ${
                                      showSubtasks[task.id] ? "rotate-90" : ""
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                  {showSubtasks[task.id] ? "Hide" : "Show"}{" "}
                                  Subtasks ({task.result.subtasks.length})
                                </button>

                                {showSubtasks[task.id] && (
                                  <div className="mt-2 pl-2 border-l-2 border-blue-200 dark:border-blue-800 space-y-2">
                                    {task.result.subtasks.map(
                                      (subtask, index) => (
                                        <div
                                          key={subtask.agentId || index}
                                          className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700"
                                        >
                                          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                                            {subtask.agentName}
                                            {subtask.role && (
                                              <span className="ml-1 text-gray-500 dark:text-gray-400">
                                                ({subtask.role})
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-gray-600 dark:text-gray-400 mb-1">
                                            {subtask.input}
                                          </div>
                                          <div className="bg-white dark:bg-gray-900 p-1 rounded border border-gray-100 dark:border-gray-700 whitespace-pre-wrap">
                                            {subtask.output}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-sm">
                          {typeof task.result === "object"
                            ? JSON.stringify(task.result, null, 2)
                            : task.result}
                        </div>
                      )}
                    </div>
                  )}

                  {task.status === "failed" && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                      {task.error}
                    </div>
                  )}

                  {task.isCollaborative &&
                    task.subtasks &&
                    task.subtasks.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleSubtasks(task.id)}
                          className="flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <svg
                            className={`w-4 h-4 mr-1 transition-transform ${
                              showSubtasks[task.id] ? "rotate-90" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          {showSubtasks[task.id] ? "Hide" : "Show"} Subtasks (
                          {task.subtasks.length})
                        </button>

                        {showSubtasks[task.id] && (
                          <div className="mt-2 pl-2 border-l-2 border-blue-200 dark:border-blue-800 space-y-2">
                            {task.subtasks.map((subtask, index) => (
                              <div
                                key={subtask.agentId || index}
                                className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700"
                              >
                                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                                  {subtask.agentName}
                                  {subtask.role && (
                                    <span className="ml-1 text-gray-500 dark:text-gray-400">
                                      ({subtask.role})
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-600 dark:text-gray-400 mb-1">
                                  {subtask.input}
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-1 rounded border border-gray-100 dark:border-gray-700 whitespace-pre-wrap">
                                  {subtask.output}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(task.created).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
