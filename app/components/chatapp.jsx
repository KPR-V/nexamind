// components/chatapp.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Message from "./message";
import ChatInput from "./chatinput";
import { useUserData } from "../../contexts/UserDataContext";
import FileUpload from "./FileUpload";
import Navbar from "./navbar";
import StorachaPanel from "./storachapanel";
import { useSidebar } from "./ui/SidebarContext";

const apiClient = axios.create({
  timeout: 190000,
  retryDelay: 3000,
  maxRetries: 3,
});

apiClient.interceptors.response.use(undefined, async (err) => {
  const { config, message } = err;
  if (!config || !config.retry) {
    return Promise.reject(err);
  }
  config.__retryCount = config.__retryCount || 0;
  if (config.__retryCount >= config.maxRetries) {
    return Promise.reject(err);
  }
  config.__retryCount += 1;
  const backoff = new Promise((resolve) => {
    setTimeout(() => {
      console.log("Retrying request", config.url);
      resolve();
    }, config.retryDelay || 1);
  });
  await backoff;
  return await apiClient(config);
});

const toolSupportedModels = [
  "llama3.1:8b",
  "qwen2.5:7b",
  "qwen2.5-coder:7b",
  "phi4-mini:3.8b",
  "mistral:7b",
];

const ChatApp = ({ initialConversation, onConversationSaved }) => {
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [imageModels, setImageModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedImageModel, setSelectedImageModel] = useState("");
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode only
  const [error, setError] = useState(null);
  const [isImageMode, setIsImageMode] = useState(false);
  const [enableTools, setEnableTools] = useState(true);
  const [messageTools, setMessageTools] = useState({});
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const conversationRef = useRef([]);
  const [showStorachaPanel, setShowStorachaPanel] = useState(false);
  const { isConnected, address, saveConversation, saveGeneratedImage } =
    useUserData();
  const { collapsed, isMobile } = useSidebar();
  const [enableWebSearchForNonToolModels, setEnableWebSearchForNonToolModels] = useState(false);
 
  useEffect(() => {
    try {
    
      const savedMessages = localStorage.getItem("chatMessages");
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      }

 
      const savedModel = localStorage.getItem("selectedModel");
      if (savedModel) {
        setSelectedModel(savedModel);
      }

   
      document.documentElement.classList.add("dark");


      const savedImageMode = localStorage.getItem("imageMode");
      if (savedImageMode) {
        setIsImageMode(savedImageMode === "true");
      }

   
      const savedToolsEnabled = localStorage.getItem("enableTools");
      if (savedToolsEnabled !== null) {
        setEnableTools(savedToolsEnabled === "true");
      }
 
    const savedWebSearchForNonToolModels = localStorage.getItem("enableWebSearchForNonToolModels");
    if (savedWebSearchForNonToolModels !== null) {
      setEnableWebSearchForNonToolModels(savedWebSearchForNonToolModels === "true");
    }
    } catch (e) {
      console.error("Error loading preferences:", e);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("enableWebSearchForNonToolModels", enableWebSearchForNonToolModels.toString());
  }, [enableWebSearchForNonToolModels]);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem("chatMessages", JSON.stringify(messages));

     
        conversationRef.current = messages.map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        }));
      } catch (e) {
        console.error("Error saving messages:", e);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (initialConversation && initialConversation.messages) {
      setMessages(initialConversation.messages);
   
      conversationRef.current = initialConversation.messages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      }));
    }
  }, [initialConversation]);


  useEffect(() => {
    localStorage.setItem("imageMode", isImageMode.toString());
  }, [isImageMode]);


  useEffect(() => {
    localStorage.setItem("enableTools", enableTools.toString());
  }, [enableTools]);


  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem("selectedModel", selectedModel);
    }
  }, [selectedModel]);

 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  useEffect(() => {
    fetchModels();
    fetchImageModels();
  }, []);

  const fetchModels = async () => {
    setError(null);
    try {
      const response = await axios.get("/api/lilypad");
      const data = response.data.data.models;
      setModels(data);
      if (data.length > 0 && !selectedModel) {
        setSelectedModel(data[0]);
      }
    } catch (error) {
      console.error("❌ Error fetching models:", error);
      setError("Failed to load chat models. Please try again later.");
    }
  };

  const fetchImageModels = async () => {
    try {
      const response = await axios.get("/api/image/models");
      const data = response.data.data.models;
      setImageModels(data);
      if (data.length > 0) {
        setSelectedImageModel(data[0]);
      }
    } catch (error) {
      console.error("❌ Error fetching image models:", error);
  
    }
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setShowModelDialog(false);
  };

  const handleImageModelSelect = (model) => {
    setSelectedImageModel(model);
  };

  const toggleModelDialog = () => {
    setShowModelDialog((prev) => !prev);
  };
  const toggleWebSearchForNonToolModels = () => {
    setEnableWebSearchForNonToolModels(prev => !prev);
  };
  const toggleImageMode = () => {
    setIsImageMode((prev) => !prev);
  };

  const toggleTools = () => {
    setEnableTools((prev) => !prev);
  };

  const clearConversation = () => {
    if (window.confirm("Are you sure you want to clear this conversation?")) {
      setMessages([]);
      localStorage.removeItem("chatMessages");
      conversationRef.current = [];
      setMessageTools({});
    }
  };

  const downloadConversation = () => {
    try {
      if (messages.length === 0) {
        alert("No conversation to download.");
        return;
      }

      const conversationText = messages
        .map((msg) => {
          const sender = msg.sender === "user" ? "You" : "Assistant";
          return `${sender}: ${msg.text}`;
        })
        .join("\n\n");

      const blob = new Blob([conversationText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();

   
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Failed to download conversation:", error);
      alert("Failed to download conversation.");
    }
  };

  const handleSendMessage = async (message) => {
    const userMessage = {
      id: `user-${Date.now()}`,
      text: message,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    if (isImageMode) {
      await handleImageGeneration(message);
    } else {
      await handleTextResponse(message);
    }
  };

  const handleSaveToStoracha = async () => {
    if (!isConnected) {
      setError("Please connect your wallet to save conversations to Storacha");
      return;
    }

    if (messages.length === 0) {
      setError("No conversation to save");
      return;
    }

    try {
      setIsProcessing(true);
      const result = await saveConversation(messages);

      alert(`Conversation saved to Storacha! CID: ${result.cid}`);
    } catch (error) {
      console.error("Failed to save to Storacha:", error);
      setError("Failed to save conversation to Storacha. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!selectedImageModel) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          text: "No image model selected. Please try again.",
          sender: "bot",
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
   
        const userMessage = {
          id: `user-${Date.now()}`,
          text: "I've uploaded an image for reference.",
          sender: "user",
          imageUrl: e.target.result,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);

      
        const promptMessage = "Analyzing the uploaded image...";
        await handleTextResponse(promptMessage, e.target.result);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          text: `Error processing image: ${error.message || "Unknown error"}`,
          sender: "bot",
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleImageGeneration = async (prompt) => {
    if (!selectedImageModel) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          text: "No image model selected. Please select an image model in settings.",
          sender: "bot",
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    try {
      setIsProcessing(true);

      const tempId = `bot-img-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          text: "Generating image...",
          sender: "bot",
          isTyping: true,
          timestamp: new Date().toISOString(),
        },
      ]);


      const response = await axios.post(
        "/api/image/generate",
        {
          model: selectedImageModel,
          prompt: prompt,
        },
        {
          responseType: "arraybuffer",
        }
      );

   
      const base64Image = `data:image/png;base64,${Buffer.from(
        response.data
      ).toString("base64")}`;

    
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                text: `Here's the generated image for: "${prompt}"`,
                imageUrl: base64Image,
                isTyping: false,
              }
            : msg
        )
      );

      if (isConnected && address) {
    
        const fetchResponse = await fetch(base64Image);
        const imageBlob = await fetchResponse.blob();

     
        saveGeneratedImage(imageBlob, prompt)
          .then((result) => {
            console.log("Image saved to Storacha:", result.cid);
          })
          .catch((err) => {
            console.error("Failed to save image to Storacha:", err);
          });
      }
    } catch (error) {
      console.error("❌ Error generating image:", error);

   
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                text: `Failed to generate image: ${
                  error.response?.data?.error ||
                  error.message ||
                  "Unknown error"
                }`,
                isTyping: false,
                isError: true,
              }
            : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextResponse = async (currentMessage, imageData = null) => {
    if (!selectedModel) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          text: "Please select a model first.",
          sender: "bot",
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);

   
    const typingMessageId = `bot-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: typingMessageId,
        text: "",
        sender: "bot",
        isTyping: true,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
    
      const modelSupportsTools = toolSupportedModels.includes(selectedModel);
      const useTools = modelSupportsTools && enableTools;
      const requestConfig = {
        retry: true,
        maxRetries: 3,
        retryDelay: 3000,
      };
   
      const response = await apiClient.post(
        "/api/chatlilypad",
        {
          model: selectedModel,
          message: currentMessage,
          conversation: conversationRef.current,
          imageData: imageData, 
          enableTools: useTools, 
          enableWebSearchForNonToolModels: enableWebSearchForNonToolModels, 
        },
        requestConfig
      );

     
      if (response.data.content) {
        const { content, toolsUsed } = response.data;

  
        const newMessageId = `bot-${Date.now()}`;
        if (toolsUsed && toolsUsed.length > 0) {
          setMessageTools((prev) => ({
            ...prev,
            [newMessageId]: toolsUsed,
          }));
        }

      
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === typingMessageId
              ? {
                  id: newMessageId,
                  text: content,
                  sender: "bot",
                  isTyping: false,
                  isFinal: true,
                  timestamp: new Date().toISOString(),
                }
              : msg
          )
        );
      } else {
      
        const fullText = response.data;

       
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === typingMessageId
              ? {
                  ...msg,
                  text: fullText,
                  isTyping: false,
                  isFinal: true,
                  timestamp: new Date().toISOString(),
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("❌ Error getting response:", error);

  
      setMessages((prev) => {
        const errorMessage =
          error.response?.data?.error ||
          error.message ||
          "Something went wrong.";

        return prev.map((msg) =>
          msg.id === typingMessageId
            ? {
                ...msg,
                text: `Error: ${errorMessage}`,
                isTyping: false,
                isError: true,
                timestamp: new Date().toISOString(),
              }
            : msg
        );
      });

      setError("Failed to get response. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getLastMessage = () => {
    if (messages.length === 0) return null;
    return messages[messages.length - 1];
  };

  const isModelToolCapable = (model) => {
    return toolSupportedModels.includes(model);
  };

  return (
    <div
      className={`flex flex-col h-screen transition-all duration-300 ${
        !isMobile && collapsed ? "lg:ml-16" : "lg:ml-72"
      }`}
    >
      <Navbar
        isImageMode={isImageMode}
        setIsImageMode={toggleImageMode}
        selectedModel={selectedModel}
        toggleModelDialog={toggleModelDialog}
        enableTools={enableTools}
        toggleTools={toggleTools}
        isConnected={isConnected}
        showStorachaPanel={showStorachaPanel}
        setShowStorachaPanel={setShowStorachaPanel}
        isModelToolCapable={isModelToolCapable}
        clearConversation={clearConversation}
        downloadConversation={downloadConversation}
        collapsed={collapsed}
        enableWebSearchForNonToolModels={enableWebSearchForNonToolModels}
        toggleWebSearchForNonToolModels={toggleWebSearchForNonToolModels}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900">
        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 relative">
        
          <StorachaPanel
            isOpen={showStorachaPanel}
            onClose={() => setShowStorachaPanel(false)}
            onSaveConversation={handleSaveToStoracha}
            isProcessing={isProcessing}
            hasMessages={messages.length > 0}
          />

          <div
            ref={chatContainerRef}
            className="h-[calc(100vh-180px)] overflow-y-auto scroll-visible py-4 pb-8"
          >
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-md mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-200 hover:text-red-100"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-white"
                  >
                    {isImageMode ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                      />
                    )}
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-300 mb-2">
                  {isImageMode
                    ? "Create AI-generated images"
                    : "Start a new conversation"}
                </h2>
                <p className="text-gray-400 max-w-md">
                  {isImageMode
                    ? "Describe the image you want to generate in detail. The more specific you are, the better the results."
                    : "Ask questions or start a conversation with the AI. Type your message below to begin."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-xl">
                  {isImageMode
                    ? [
                        "A breathtaking mountain landscape at sunset",
                        "A futuristic city with flying cars and neon lights",
                        "A cute cat astronaut floating in space",
                        "A magical forest with glowing mushrooms and fairies",
                      ]
                    : [
                        "Explain quantum computing in simple terms",
                        "What's the weather in Tokyo right now?",
                        "Help me plan a 7-day trip to Japan",
                        "What are the latest developments in AI?",
                      ].map((prompt, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="text-left p-3 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors shadow-sm"
                          onClick={() => handleSendMessage(prompt)}
                        >
                          {prompt}
                        </motion.button>
                      ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <Message
                    key={msg.id || index}
                    message={msg}
                    toolsUsed={messageTools[msg.id] || []}
                  />
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>

          <div className="sticky bottom-0 left-0 right-0 z-10 bg-zinc-900 pt-4 pb-2 border-t border-zinc-800">
            <ChatInput
              onSend={handleSendMessage}
              onImageUpload={handleImageUpload}
              isProcessing={isProcessing}
              lastMessage={getLastMessage()}
              isImageMode={isImageMode}
            />
            <div className="mt-2 flex flex-wrap text-xs text-gray-400">
              <span className="mr-4">
                {isImageMode ? "Image" : "Chat"}:{" "}
                {isImageMode
                  ? selectedImageModel || "No model selected"
                  : selectedModel || "No model selected"}
              </span>
            </div>
          </div>
        </div>
      </div>

   
      {showModelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Select Models</h2>
              <button
                onClick={toggleModelDialog}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <h3 className="font-medium text-white mb-2">Chat Models</h3>
              {models.length === 0 ? (
                <div className="text-gray-400 flex items-center p-3 border border-gray-700 rounded-md">
                  <svg
                    className="animate-spin h-5 w-5 mr-3 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading models...
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {models.map((model, index) => (
                    <div
                      key={index}
                      onClick={() => handleModelSelect(model)}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedModel === model
                          ? "border-blue-500 bg-blue-900/30"
                          : "border-gray-700 hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {selectedModel === model && (
                            <svg
                              className="w-5 h-5 text-blue-400 mr-2"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <span
                            className={`${
                              selectedModel === model ? "font-medium" : ""
                            } text-white`}
                          >
                            {model}
                          </span>
                        </div>

                        {toolSupportedModels.includes(model) && (
                          <span className="text-xs px-2 py-1 bg-green-900/30 text-green-300 rounded-full flex items-center">
                            <svg
                              className="w-3 h-3 mr-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Tools
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-white mb-2">
                Image Generation Models
              </h3>
              {imageModels.length === 0 ? (
                <div className="text-gray-400 flex items-center p-3 border border-gray-700 rounded-md">
                  <svg
                    className="animate-spin h-5 w-5 mr-3 text-purple-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading image models...
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {imageModels.map((model, index) => (
                    <div
                      key={index}
                      onClick={() => handleImageModelSelect(model)}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedImageModel === model
                          ? "border-purple-500 bg-purple-900/30"
                          : "border-gray-700 hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center">
                        {selectedImageModel === model && (
                          <svg
                            className="w-5 h-5 text-purple-400 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        <span
                          className={`${
                            selectedImageModel === model ? "font-medium" : ""
                          } text-white`}
                        >
                          {model}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={toggleModelDialog}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;
