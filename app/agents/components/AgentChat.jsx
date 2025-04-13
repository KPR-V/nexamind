"use client";

import { useState, useEffect, useRef } from "react";
import { useAgent } from "../../../contexts/AgentContext";
import { useUserData } from "../../../contexts/UserDataContext";

export default function AgentChat() {
  const { selectedAgent, executeTask, isProcessing } = useAgent();
  const { saveConversation } = useUserData();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");

    try {
      const taskType = determineTaskType(selectedAgent);

      console.log(`Executing task with type: ${taskType}`, {
        agentType: selectedAgent?.type,
        tools: selectedAgent?.tools,
      });

      const response = await executeTask(taskType, inputMessage);

      console.log("Raw response from agent:", response);

      let responseContent = response;
      if (
        !responseContent ||
        responseContent === "Empty Response" ||
        responseContent === "undefined"
      ) {
        if (selectedAgent?.type === "ollama") {
          responseContent =
            "I couldn't generate a proper response. This might be due to Ollama not running properly on your system. Please check that Ollama is running with the correct model.";
        } else if (selectedAgent?.type === "openai") {
          responseContent =
            "I couldn't generate a proper response. There might be an issue with the OpenAI API key or connection. Please check your API settings.";
        } else {
          responseContent =
            "I couldn't generate a proper response at this time. Please try again or try a different question.";
        }
      }

      const assistantMessage = {
        role: "assistant",
        content: responseContent,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in chat:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${error.message || "Something went wrong"}`,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    }
  };

  const determineTaskType = (agent) => {
    if (!agent) return "rag-query";

    if (agent.type === "ollama") {
      return "llama-chat";
    }

    if (agent.tools && agent.tools.includes("web-search")) {
      return "web-search";
    }

    return "rag-query";
  };

  const handleSaveConversation = async () => {
    if (messages.length === 0) return;

    try {
      await saveConversation(messages);
      alert("Conversation saved successfully");
    } catch (error) {
      console.error("Error saving conversation:", error);
      alert("Failed to save conversation");
    }
  };

  const formatMessageContent = (content) => {
    if (typeof content !== "string") {
      return String(content || "");
    }

    content = content.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded my-2 overflow-x-auto"><code>$1</code></pre>'
    );

    content = content.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">$1</code>'
    );

    content = content.replace(/^- (.*)$/gm, '<li class="ml-4">$1</li>');

    content = content.replace(/\n/g, "<br />");

    return content;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6 max-w-md">
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Send a message to start chatting with{" "}
                {selectedAgent?.name || "the agent"}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3/4 rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : msg.role === "system" && msg.isError
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: formatMessageContent(msg.content),
                  }}
                />
                <div className="text-xs opacity-70 text-right mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSaveConversation}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Save Conversation
          </button>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isProcessing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Processing
              </span>
            ) : (
              "Send"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
