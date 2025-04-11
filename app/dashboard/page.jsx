"use client";

import { useState, useEffect } from "react";
import { useUserData } from "../../contexts/UserDataContext";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function DashboardPage() {
  const { isConnected, conversations, generatedImages, uploadedFiles } =
    useUserData();
  const [activeTab, setActiveTab] = useState("conversations");

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-zinc-50 dark:bg-zinc-900">
        <div className="max-w-md w-full bg-white dark:bg-zinc-800 p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6 text-zinc-900 dark:text-white">
            Connect Your Wallet
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 mb-8 text-center">
            Connect your wallet to access your stored conversations, images, and
            files on Storacha.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-zinc-50 dark:bg-zinc-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-zinc-900 dark:text-white">
        Your Storacha Storage
      </h1>

      <div className="mb-6">
        <div className="flex border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab("conversations")}
            className={`py-2 px-4 ${
              activeTab === "conversations"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Conversations
          </button>
          <button
            onClick={() => setActiveTab("images")}
            className={`py-2 px-4 ${
              activeTab === "images"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Generated Images
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`py-2 px-4 ${
              activeTab === "files"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Uploaded Files
          </button>
        </div>
      </div>

      {activeTab === "conversations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conversations.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 col-span-full">
              No conversations saved yet.
            </p>
          ) : (
            conversations.map((convo) => (
              <div
                key={convo.id}
                className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow"
              >
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {new Date(convo.timestamp).toLocaleString()}
                </p>
                <div className="mt-2 text-zinc-800 dark:text-zinc-200 line-clamp-3">
                  {convo.messages[0]?.text || "No content"}
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    CID: {convo.id.substring(0, 10)}...
                  </span>
                  <a
                    href={convo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "images" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generatedImages.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 col-span-full">
              No images saved yet.
            </p>
          ) : (
            generatedImages.map((img) => (
              <div
                key={img.id}
                className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow"
              >
                <img
                  src={img.url}
                  alt={img.prompt}
                  className="w-full h-48 object-cover rounded-md"
                />
                <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2">
                  {img.prompt}
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  {new Date(img.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "files" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploadedFiles.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 col-span-full">
              No files uploaded yet.
            </p>
          ) : (
            uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow"
              >
                <div className="flex items-center">
                  <svg
                    className="w-8 h-8 text-zinc-400 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div>
                    <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                      {file.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    {new Date(file.timestamp).toLocaleString()}
                  </span>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
