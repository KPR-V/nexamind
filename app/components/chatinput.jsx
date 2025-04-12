// components/ChatInput.jsx
"use client";
import React, { memo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

const ChatInput = memo(
  ({ onSend, onImageUpload, isProcessing, lastMessage, isImageMode }) => {
    const [localMessage, setLocalMessage] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, []);

    useEffect(() => {
      if (lastMessage && lastMessage.sender === "bot" && !isProcessing) {
        generateSuggestions(lastMessage.text);
      } else {
        setSuggestions([]);
      }
    }, [lastMessage, isProcessing]);

    const generateSuggestions = (text) => {
      const lowercaseText = text?.toLowerCase() || "";
      const defaultSuggestions = [
        "Tell me more",
        "Why is that important?",
        "Can you explain it differently?",
      ];

      if (isImageMode) {
        setSuggestions([
          "Generate an image of a mountain landscape",
          "Create an image of a futuristic city",
          "Draw a cat in space",
        ]);
      } else if (
        lowercaseText.includes("image") ||
        lowercaseText.includes("picture")
      ) {
        setSuggestions([
          "Tell me more about this concept",
          "What are some applications?",
        ]);
      } else if (
        lowercaseText.includes("code") ||
        lowercaseText.includes("programming")
      ) {
        setSuggestions([
          "Explain this code",
          "Give me an example",
          "How would I implement this?",
        ]);
      } else {
        setSuggestions(defaultSuggestions);
      }
    };

    const handleChange = (e) => setLocalMessage(e.target.value);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (localMessage.trim()) {
        onSend(localMessage.trim());
        setLocalMessage("");
        setSuggestions([]);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    const handleSuggestionClick = (suggestion) => {
      onSend(suggestion);
      setSuggestions([]);
    };

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        alert("File size too large. Please upload an image smaller than 100MB");
        return;
      }

      onImageUpload(file);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    return (
      <div className="bg-zinc-900 z-20">
        {suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full text-zinc-300 transition-colors shadow-sm"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-center bg-zinc-900 rounded-md"
        >
          <div className="relative flex-1 flex items-center"> 
            <textarea
              ref={inputRef}
              value={localMessage}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isImageMode
                  ? "Describe the image you want to generate..."
                  : "Type a message or ask me anything..."
              }
              rows={1} 
              className={`w-full bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-tl-md rounded-bl-md p-3 pr-10 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isFocused ? "border-blue-500" : "border-zinc-700"
              }`}
              disabled={isProcessing}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={{ 
                minHeight: "44px",
                maxHeight: "100px", 
                overflow: "auto" 
              }}
            />

            {!isImageMode && (
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={isProcessing}
                className="absolute right-2 bottom-2 text-zinc-400 hover:text-zinc-300 p-1 rounded-full transition-colors"
                title="Upload image"
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
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isProcessing || !localMessage.trim()}
            whileTap={{ scale: 0.95 }}
            className={`rounded-tr-md rounded-br-md h-[50px] p-3 text-white transition-colors flex items-center justify-center min-w-[60px] ${
              isProcessing
                ? "bg-zinc-600"
                : localMessage.trim()
                ? isImageMode
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
                : "bg-zinc-700 cursor-not-allowed"
            }`}
            style={{ alignSelf: "stretch" }} // Make sure button stretches to match container height
          >
            {isProcessing ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
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
            ) : isImageMode ? (
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
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
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
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </motion.button>
        </form>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
export default ChatInput;
