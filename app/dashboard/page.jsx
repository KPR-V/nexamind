"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import axios from "axios";

export default function DashboardPage() {
  const { isConnected, address: walletAddress } = useAccount();
  const [activeTab, setActiveTab] = useState("conversations");
  const [spaceId, setSpaceId] = useState("");
  const [conversations, setConversations] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchSpaceId();
    }
  }, [isConnected, walletAddress]);

  const fetchSpaceId = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/getSpaceForWallet", {
        params: { walletAddress }
      });
      
      if (response.data && response.data.did) {
        setSpaceId(response.data.did);
        fetchStoredData(response.data.did);
      }
    } catch (error) {
      console.error("Error fetching space ID:", error);
      setError("Failed to fetch your space. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    if (!spaceId || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await fetchStoredData(spaceId);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchStoredData = async (did) => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/listUploads", {
        params: { did }
      });
      
      if (response.data && Array.isArray(response.data.uploads)) {
        const chats = [];
        const files = [];
        const images = [];
        
        await Promise.all(
          response.data.uploads.map(async (upload) => {
            try {
              const cidString = upload.root.toString();
              
              let contentResponse;
              try {
                contentResponse = await axios.get(`http://localhost:5000/getUpload`, {
                  params: { cid: cidString, did }
                });
              } catch (fetchError) {
                console.warn(`Could not get details for upload ${cidString}, using basic info`);
                files.push({
                  id: cidString,
                  name: `File ${cidString.substring(0, 8)}...`,
                  size: upload.size || 0,
                  timestamp: upload.uploaded || Date.now(),
                  url: `https://${cidString}.ipfs.w3s.link`,
                  type: 'file'
                });
                return;
              }
              
              const data = contentResponse.data;
              
              if (data.type === "chat" || 
                  (data.messages && Array.isArray(data.messages)) || 
                  (Array.isArray(data) && data.length > 0 && data[0].sender)) {
                const messages = Array.isArray(data) ? data : (data.messages || []);
                
                chats.push({
                  id: cidString,
                  messages: messages,
                  timestamp: upload.uploaded || data.timestamp || Date.now(),
                  url: `https://${cidString}.ipfs.w3s.link`,
                  title: getChatTitle(messages)
                });
              } else if (data.type === "image" || 
                        (data.mimetype && data.mimetype.startsWith("image/")) ||
                        (data.url && (data.prompt || data.description))) {
                images.push({
                  id: cidString,
                  url: data.url || `https://${cidString}.ipfs.w3s.link`,
                  prompt: data.prompt || data.description || "Image",
                  timestamp: upload.uploaded || data.timestamp || Date.now()
                });
              } else {
                files.push({
                  id: cidString,
                  name: data.name || `File ${cidString.substring(0, 8)}...`,
                  size: data.size || upload.size || 0,
                  timestamp: upload.uploaded || data.uploadedAt || Date.now(),
                  url: `https://${cidString}.ipfs.w3s.link`,
                  type: data.type || 'file',
                  mimetype: data.mimetype
                });
              }
            } catch (error) {
              console.error(`Error processing upload ${upload.root}:`, error);
              files.push({
                id: upload.root.toString(),
                name: `Unknown file ${upload.root.toString().substring(0, 8)}...`,
                size: upload.size || 0,
                timestamp: upload.uploaded || Date.now(),
                url: `https://${upload.root.toString()}.ipfs.w3s.link`,
                type: 'file',
                error: true
              });
            }
          })
        );
        
        setConversations(chats);
        setUploadedFiles(files);
        setGeneratedImages(images);
      }
    } catch (error) {
      console.error("Error fetching stored data:", error);
      setError("Failed to load your stored data");
    } finally {
      setIsLoading(false);
    }
  };

  const getChatTitle = (messages) => {
    if (!messages || !Array.isArray(messages)) return "Saved Chat";
    
    const firstUserMessage = messages.find(m => m.sender === "user");
    if (firstUserMessage && firstUserMessage.text) {
      return firstUserMessage.text.length > 30
        ? firstUserMessage.text.substring(0, 30) + "..."
        : firstUserMessage.text;
    }
    
    return "Saved Chat";
  };

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
      <div className="flex items-center justify-between mb-6">
        <a 
          href="/"
          className="flex items-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          Home
        </a>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Your Storacha Storage
        </h1>
        <button 
          onClick={refreshData} 
          disabled={isRefreshing}
          className="flex items-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-colors"
          title="Refresh data"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {spaceId && (
        <div className="mb-4 p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Your Space:</span>
              <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 truncate" title={spaceId}>
                {spaceId.length > 40 ? `${spaceId.substring(0, 20)}...${spaceId.substring(spaceId.length - 20)}` : spaceId}
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      ) : (
        <>
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
                      {convo.title || "Saved Conversation"}
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
                    className={`bg-white dark:bg-zinc-800 p-4 rounded-lg shadow ${file.error ? 'border border-yellow-500 dark:border-yellow-700' : ''}`}
                  >
                    <div className="flex items-center">
                      {file.mimetype?.startsWith('image/') ? (
                        <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded mr-3 flex items-center justify-center overflow-hidden">
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'%3E%3C/path%3E%3Cpolyline points='14 2 14 8 20 8'%3E%3C/polyline%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                      ) : (
                        <svg
                          className="w-10 h-10 text-zinc-400 mr-3"
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
                      )}
                      <div className="overflow-hidden">
                        <p className="text-zinc-800 dark:text-zinc-200 font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatFileSize(file.size)} {file.mimetype && `• ${file.mimetype.split('/')[1]?.toUpperCase() || file.mimetype}`}
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
                        {file.error ? 'Try View' : 'Download'}
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
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
