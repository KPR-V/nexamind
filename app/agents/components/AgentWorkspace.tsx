"use client";

import { useState, useEffect } from "react";
import { useAgent } from "../../../contexts/AgentContext";
import AgentSelector from "./AgentSelector";
import TaskDefinition from "./TaskDefinition";
import AgentChat from "./AgentChat";

import { Document } from "llamaindex";

export default function AgentWorkspace() {
  const {
    selectedAgent,
    isProcessing,
    documents,
    addDocument,
    clearDocuments,
  } = useAgent();

  const [activeTab, setActiveTab] = useState<"chat" | "task">("chat");
  const [fileUploads, setFileUploads] = useState<File[]>([]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setFileUploads(Array.from(files));

    for (const file of files) {
      try {
        const text = await file.text();
        const doc = new Document({
          text,
          id_: file.name,
          metadata: {
            filename: file.name,
            type: file.type,
          },
        });
        addDocument(doc);
      } catch (error) {
        console.error("Error processing file:", file.name, error);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <div className="w-full md:w-80 flex-shrink-0">
        <AgentSelector />

        {selectedAgent && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-4">
            <h2 className="text-lg font-semibold mb-3">Document Context</h2>

            <div className="mb-3">
              <label
                htmlFor="document-upload"
                className="block w-full cursor-pointer text-center py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Upload Files
              </label>
              <input
                id="document-upload"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>

            {documents.length > 0 && (
              <div className="mb-3 max-h-40 overflow-y-auto">
                <h3 className="text-sm font-medium mb-2">Uploaded Documents</h3>
                <ul className="space-y-1">
                  {documents.map((doc, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 dark:text-gray-400"
                    >
                      {doc.metadata?.filename || `Document ${index + 1}`}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full mt-2 py-1 px-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-md"
                  onClick={clearDocuments}
                >
                  Clear Documents
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1">
        {!selectedAgent ? (
          <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">No Agent Selected</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Please select an agent from the sidebar to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{selectedAgent.name}</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedAgent.type} • {selectedAgent.modelName}
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {selectedAgent.description}
              </p>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === "chat"
                      ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("chat")}
                >
                  Chat
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === "task"
                      ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("task")}
                >
                  Tasks
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "chat" ? <AgentChat /> : <TaskDefinition />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
