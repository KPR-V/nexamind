// components/chatapp.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Message from "./message";
import ChatInput from "./chatinput";

// List of models that support tool calls
const toolSupportedModels = [
  "llama3.1:8b",
  "qwen2.5:7b",
  "qwen2.5-coder:7b",
  "phi4-mini:3.8b",
  "mistral:7b",
];

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [imageModels, setImageModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedImageModel, setSelectedImageModel] = useState("");
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState(null);
  const [isImageMode, setIsImageMode] = useState(false);
  const [enableTools, setEnableTools] = useState(true);
  const [messageTools, setMessageTools] = useState({});
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const conversationRef = useRef([]);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      // Check for saved messages
      const savedMessages = localStorage.getItem("chatMessages");
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      }

      // Check for saved model preference
      const savedModel = localStorage.getItem("selectedModel");
      if (savedModel) {
        setSelectedModel(savedModel);
      }

      // Check for saved theme preference
      const savedTheme = localStorage.getItem("darkMode");
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const shouldUseDark =
        savedTheme === "true" || (savedTheme === null && prefersDark);
      setIsDarkMode(shouldUseDark);

      // Set up theme class on body
      document.documentElement.classList.toggle("dark", shouldUseDark);

      // Check for saved image mode
      const savedImageMode = localStorage.getItem("imageMode");
      if (savedImageMode) {
        setIsImageMode(savedImageMode === "true");
      }

      // Check for saved tools preference
      const savedToolsEnabled = localStorage.getItem("enableTools");
      if (savedToolsEnabled !== null) {
        setEnableTools(savedToolsEnabled === "true");
      }
    } catch (e) {
      console.error("Error loading preferences:", e);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem("chatMessages", JSON.stringify(messages));

        // Update conversation context reference
        conversationRef.current = messages.map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        }));
      } catch (e) {
        console.error("Error saving messages:", e);
      }
    }
  }, [messages]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", isDarkMode.toString());
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // Save image mode preference
  useEffect(() => {
    localStorage.setItem("imageMode", isImageMode.toString());
  }, [isImageMode]);

  // Save tools preference
  useEffect(() => {
    localStorage.setItem("enableTools", enableTools.toString());
  }, [enableTools]);

  // Save model preference
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem("selectedModel", selectedModel);
    }
  }, [selectedModel]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch available models on component mount
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
      // Non-blocking error since image generation is optional
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

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
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

      // Cleanup
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
        // Create a user message with the image
        const userMessage = {
          id: `user-${Date.now()}`,
          text: "I've uploaded an image for reference.",
          sender: "user",
          imageUrl: e.target.result,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);

        // Make API call for image-based generation
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

      // Add a placeholder message for the image generation
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

      // Call the image generation API
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

      // Convert binary data to base64
      const base64Image = `data:image/png;base64,${Buffer.from(
        response.data
      ).toString("base64")}`;

      // Update the message with the generated image
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
    } catch (error) {
      console.error("❌ Error generating image:", error);

      // Update the placeholder message with the error
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

    // Add a typing indicator
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
      // Check if model supports tools
      const modelSupportsTools = toolSupportedModels.includes(selectedModel);
      const useTools = modelSupportsTools && enableTools;

      // Prepare conversation history for context
      const response = await axios.post("/api/chatlilypad", {
        model: selectedModel,
        message: currentMessage,
        conversation: conversationRef.current,
        imageData: imageData, // Pass image data if available
        enableTools: useTools, // Only enable tools if supported and enabled
      });

      // If the response has a content property, it's the new JSON format with tool info
      if (response.data.content) {
        const { content, toolsUsed } = response.data;

        // Store which tools were used for this message
        const newMessageId = `bot-${Date.now()}`;
        if (toolsUsed && toolsUsed.length > 0) {
          setMessageTools((prev) => ({
            ...prev,
            [newMessageId]: toolsUsed,
          }));
        }

        // Update the typing message with the actual response
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
        // Handle legacy format for backward compatibility
        const fullText = response.data;

        // Update the typing message with the actual response
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

      // Update with error message
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
      className={`flex flex-col h-screen p-4 transition-colors ${
        isDarkMode ? "dark" : ""
      }`}
    >
      <div className="bg-white dark:bg-gray-900 transition-colors duration-200 flex-1 flex flex-col max-w-4xl mx-auto w-full rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between bg-white dark:bg-gray-900">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mr-3 shadow-md">
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
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Nexamind Chat
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isImageMode ? "Image Generation Mode" : "Text Chat Mode"}
                {!isImageMode &&
                  toolSupportedModels.includes(selectedModel) && (
                    <span className="ml-2">
                      • Tools {enableTools ? "Enabled" : "Disabled"}
                    </span>
                  )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Mode toggle */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setIsImageMode(false)}
                className={`text-sm px-2 py-1 rounded ${
                  !isImageMode
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setIsImageMode(true)}
                className={`text-sm px-2 py-1 rounded ${
                  isImageMode
                    ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Image
              </button>
            </div>

            {/* Tools toggle (only show if model supports tools and not in image mode) */}
            {!isImageMode && isModelToolCapable(selectedModel) && (
              <button
                onClick={toggleTools}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                  enableTools
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                }`}
              >
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Tools
                </div>
              </button>
            )}

            <button
              onClick={toggleDarkMode}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={toggleModelDialog}
              className="flex items-center text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md text-gray-700 dark:text-gray-300 transition-colors"
            >
              <span className="mr-1">Model:</span>
              <span className="font-semibold">{selectedModel || "Select"}</span>
            </button>

            <div className="relative group">
              <button
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full"
                aria-label="Menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>
              </button>

              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10">
                <div className="py-1">
                  <button
                    onClick={clearConversation}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Clear conversation
                  </button>
                  <button
                    onClick={downloadConversation}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Download chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat container */}
        <div
          ref={chatContainerRef}
          className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors"
        >
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-md mb-4 flex items-center justify-between">
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
                className="text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
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
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {isImageMode
                  ? "Create AI-generated images"
                  : "Start a new conversation"}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {isImageMode
                  ? "Describe the image you want to generate in detail. The more specific you are, the better the results."
                  : "Ask questions or start a conversation with the AI. Type your message below to begin."}
              </p>

              {/* Quick prompt suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-md">
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
                        className="text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
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
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
          <ChatInput
            onSend={handleSendMessage}
            onImageUpload={handleImageUpload}
            isProcessing={isProcessing}
            lastMessage={getLastMessage()}
            isImageMode={isImageMode}
          />

          {/* Display selected models info */}
          <div className="mt-2 flex flex-wrap text-xs text-gray-500 dark:text-gray-400">
            <span className="mr-4">
              {isImageMode ? "Image" : "Chat"}:{" "}
              {isImageMode
                ? selectedImageModel
                : selectedModel || "No model selected"}
            </span>
          </div>
        </div>
      </div>

      {/* Model selection dialog */}
      {showModelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Select Models
              </h2>
              <button
                onClick={toggleModelDialog}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Chat Models
              </h3>
              {models.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400 flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md">
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
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {selectedModel === model && (
                            <svg
                              className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-2"
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
                            }`}
                          >
                            {model}
                          </span>
                        </div>

                      
                        {toolSupportedModels.includes(model) && (
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full flex items-center">
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
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Image Generation Models
              </h3>
              {imageModels.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400 flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md">
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
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-400"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center">
                        {selectedImageModel === model && (
                          <svg
                            className="w-5 h-5 text-purple-500 dark:text-purple-400 mr-2"
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
                          }`}
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
