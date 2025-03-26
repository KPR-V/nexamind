"use client";
import React, { memo, useState } from "react";

const ChatInput = memo(({ onSend, isProcessing }) => {
  const [localMessage, setLocalMessage] = useState("");

  const handleChange = (e) => setLocalMessage(e.target.value);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (localMessage.trim()) {
      onSend(localMessage.trim());
      setLocalMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex mt-4">
      <input
        type="text"
        value={localMessage}
        onChange={handleChange}
        placeholder="Type a message"
        className="flex-1 border border-gray-300 rounded-md p-2"
        disabled={isProcessing}
      />
      <button
        type="submit"
        disabled={isProcessing}
        className={`ml-2 rounded-md p-2 text-white transition-colors ${
          isProcessing ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {isProcessing ? "Sending..." : "Send"}
      </button>
    </form>
  );
});

ChatInput.displayName = "ChatInput";
export default ChatInput;
