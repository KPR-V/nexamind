"use client";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Message from "./message";
import ChatInput from "./chatinput";

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchModels = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/lilypad" || "/api/lilypad");
      const data = response.data.data.models;
      setModels(data);
      if (data.length > 0 && !selectedModel) {
        setSelectedModel(data[0]);
      }
    } catch (error) {
      console.error("❌ Error fetching models:", error);
      alert("Failed to load models. Please refresh the page.");
    }
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setShowModelDialog(false);
  };

  const toggleModelDialog = () => {
    setShowModelDialog((prev) => !prev);
  };

  const handleSendMessage = async (message) => {
   
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        text: message,
        sender: "user",
        isFinal: true,
      },
    ]);
    await handleResponse(message);
  };

  const handleResponse = async (currentMessage) => {
    if (!selectedModel) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          text: "Please select a model first.",
          sender: "bot",
          isError: true,
        },
      ]);
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true);
  
    setMessages((prev) => [
      ...prev,
      { id: `bot-${Date.now()}`, text: "", sender: "bot", isTyping: true },
    ]);

    try {
    
      const response = await axios.post(
        "http://localhost:3000/api/chatlilypad" || "/api/chatlilypad",
        {
          model: selectedModel,
          message: currentMessage,
        }
      );
    
      const fullText = response.data;
     
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === "bot" && msg.isTyping
            ? { ...msg, text: fullText, isTyping: false, isFinal: true }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.map((m) => m.sender).lastIndexOf("bot");
        if (lastIndex !== -1) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            text: `Error: ${error.message || "Something went wrong."}`,
            isTyping: false,
            isError: true,
          };
        } else {
          updated.push({
            id: `bot-err-${Date.now()}`,
            text: `Error: ${error.message || "Something went wrong."}`,
            sender: "bot",
            isError: true,
          });
        }
        return updated;
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="text-3xl font-bold text-center my-4">Nexamind Chat</h1>
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      
        <div className="mb-4 flex justify-between items-center">
          <div>
            {selectedModel ? (
              <span className="text-gray-700">
                Selected model: <strong>{selectedModel}</strong>
              </span>
            ) : (
              <span className="text-gray-500">No model selected</span>
            )}
          </div>
          <button
            onClick={toggleModelDialog}
            className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md"
          >
            Select Model
          </button>
        </div>

        {showModelDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Select a Model</h2>
              {models.length === 0 ? (
                <p className="text-gray-500">Loading models...</p>
              ) : (
                <div className="space-y-2">
                  {models.map((model, index) => (
                    <div
                      key={index}
                      onClick={() => handleModelSelect(model)}
                      className="p-2 border rounded-md cursor-pointer hover:bg-gray-100"
                    >
                      {model}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={toggleModelDialog}
                  className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        
        <div className="flex-1 border rounded-lg p-4 bg-gray-50 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center">
              No messages yet. Start chatting!
            </p>
          ) : (
            messages.map((msg, index) => (
              <Message key={msg.id || index} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSend={handleSendMessage} isProcessing={isProcessing} />
      </div>
    </div>
  );
};

export default ChatApp;
