"use client";
import axios from "axios";
import React, { useState, useRef, useEffect, memo } from "react";

// Memoized Message component with improved formatting support
const Message = memo(({ message }) => {
  const { text, sender, isTyping, isError, latestChunk, isFinal } = message;
  const isBot = sender === "bot";
  const messageRef = useRef(null);
  const [visibleText, setVisibleText] = useState("");
  const [typingAnimation, setTypingAnimation] = useState(false);

  // Format text to preserve newlines and handle markdown-like formatting
  const formatText = (text) => {
    if (!text) return "";

    // First, escape any HTML to prevent injection
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace newlines with <br> tags for HTML rendering
    // Also handle markdown-style formatting
    const formatted = escaped
      // Bold: **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic: *text* -> <em>text</em>
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Code blocks: ```text``` -> <pre><code>text</code></pre>
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      // Inline code: `text` -> <code>text</code>
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Lists: - item -> <li>item</li>
      .replace(/^- (.*?)$/gm, "<li>$1</li>")
      // Headers: # Header -> <h3>Header</h3>
      .replace(/^# (.*?)$/gm, "<h3>$1</h3>")
      // Headers: ## Header -> <h4>Header</h4>
      .replace(/^## (.*?)$/gm, "<h4>$1</h4>")
      // Newlines
      .replace(/\n/g, "<br>");

    return formatted;
  };

  // Update visible text as new chunks arrive or when message is finalized
  useEffect(() => {
    if (isBot && !isError && text && !isFinal) {
      setTypingAnimation(true);
      setVisibleText(text);
    } else if (isFinal) {
      setTypingAnimation(false);
      setVisibleText(text);
    }
  }, [isBot, text, isError, isFinal]);

  // Auto-scroll to the latest message when new content arrives
  useEffect(() => {
    if (isBot && messageRef.current && (latestChunk || isFinal)) {
      console.log("📜 Scrolling message into view");
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleText, isBot, latestChunk, isFinal]);

  return (
    <div
      ref={messageRef}
      className={`p-4 rounded-lg my-2 ${
        isBot
          ? isError
            ? "bg-red-100 text-red-800"
            : "bg-gray-100"
          : "bg-blue-500 text-white ml-auto"
      } ${isTyping ? "typing-message" : ""}`}
    >
      {isTyping && text === "" ? (
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      ) : (
        <div
          className={`message-text whitespace-pre-wrap break-words ${
            typingAnimation ? "text-typing-effect" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: formatText(visibleText) }}
        />
      )}
    </div>
  );
});
Message.displayName = "Message";

// Separate ChatInput component
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
        className="flex-1 border-2 border-gray-300 rounded-md p-2"
        disabled={isProcessing}
      />
      <button
        type="submit"
        className={`${
          isProcessing ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
        } text-white rounded-md p-2 ml-2 transition-colors`}
        disabled={isProcessing}
      >
        {isProcessing ? "Sending..." : "Send"}
      </button>
    </form>
  );
});
ChatInput.displayName = "ChatInput";

// Main Page component
class Page extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      models: [],
      selectedModel: "",
      showModelDialog: false,
      isProcessing: false,
    };

    this.messagesEndRef = React.createRef();
    this.abortControllerRef = React.createRef();
    this.renderCount = 0;

    // Bind methods
    this.handleResponse = this.handleResponse.bind(this);
    this.handleModelSelect = this.handleModelSelect.bind(this);
    this.toggleModelDialog = this.toggleModelDialog.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
    this.handleSendMessage = this.handleSendMessage.bind(this);
  }

  componentDidMount() {
    console.log("🔍 Component mounted");
    this.fetchModels();

    // Inject animation styles
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .typing-indicator {
        display: flex;
        justify-content: flex-start;
      }
      .typing-indicator span {
        width: 8px;
        height: 8px;
        margin: 0 2px;
        background-color: #888;
        border-radius: 50%;
        animation: typing-bounce 1.4s infinite ease-in-out both;
      }
      .typing-indicator span:nth-child(1) { animation-delay: 0s; }
      .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
      .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes typing-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
      .animated-text { display: inline-block; animation: fadeIn 0.3s ease-in-out; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .text-typing-effect { border-right: 2px solid #000; animation: blink-caret 0.75s step-end infinite; }
      @keyframes blink-caret { from, to { border-color: transparent; } 50% { border-color: black; } }
      
      /* Additional styles for markdown-like rendering */
      .message-text pre {
        background-color: #f0f0f0;
        padding: 0.5rem;
        border-radius: 0.25rem;
        overflow-x: auto;
        margin: 0.5rem 0;
      }
      .message-text code {
        font-family: monospace;
        background-color: rgba(0,0,0,0.05);
        padding: 0.1rem 0.2rem;
        border-radius: 0.2rem;
        font-size: 0.9em;
      }
      .message-text pre code {
        background-color: transparent;
        padding: 0;
        display: block;
      }
      .message-text h3 {
        font-size: 1.25rem;
        font-weight: bold;
        margin: 0.75rem 0 0.5rem 0;
        border-bottom: 1px solid rgba(0,0,0,0.1);
        padding-bottom: 0.25rem;
      }
      .message-text h4 {
        font-size: 1.1rem;
        font-weight: bold;
        margin: 0.5rem 0 0.25rem 0;
      }
      .message-text li {
        margin-left: 1.5rem;
        list-style-type: disc;
      }
      .message-text ul {
        margin: 0.5rem 0;
      }
    `;
    document.head.appendChild(styleElement);
    this.styleElement = styleElement;
  }

  componentDidUpdate(prevProps, prevState) {
    this.renderCount += 1;
    console.log(`🔢 Render count: ${this.renderCount}`);
    if (prevState.messages !== this.state.messages) {
      this.scrollToBottom();
    }
  }

  componentWillUnmount() {
    console.log("🧹 Component unmounting");
    if (this.abortControllerRef.current) {
      this.abortControllerRef.current.abort();
    }
    if (this.styleElement) {
      document.head.removeChild(this.styleElement);
    }
  }

  scrollToBottom() {
    console.log("📜 Scrolling to bottom");
    this.messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async fetchModels() {
    console.log("🔍 Fetching models...");
    try {
      const response = await axios.get("http://localhost:3000/api/lilypad");
      console.log("✅ Models API response:", response);
      const data = response.data.data.models;
      this.setState({ models: data }, () => {
        console.log("📋 Models received:", data);
        if (data.length > 0 && !this.state.selectedModel) {
          this.setState({ selectedModel: data[0] }, () => {
            console.log(`🔄 Auto-selected model: ${data[0]}`);
          });
        }
      });
    } catch (error) {
      console.error("❌ Error fetching models:", error);
      alert("Failed to load models. Please refresh the page.");
    }
  }

  handleModelSelect(model) {
    console.log("🔄 Model selected:", model);
    this.setState({ selectedModel: model, showModelDialog: false });
  }

  toggleModelDialog() {
    this.setState((prevState) => ({
      showModelDialog: !prevState.showModelDialog,
    }));
  }

  // Called by ChatInput component
  async handleSendMessage(message) {
    console.log("📝 Form submitted with message:", message);
    if (message.trim()) {
      // Show user message immediately
      this.setState((prevState) => ({
        messages: [
          ...prevState.messages,
          {
            id: `user-${Date.now()}`,
            text: message,
            sender: "user",
            isFinal: true,
          },
        ],
      }));
      // Then call handleResponse for bot reply
      await this.handleResponse(message);
    } else {
      console.log("⚠️ Empty message, not submitting");
    }
  }

  async handleResponse(currentMessage) {
    console.log("🚀 Starting request process");
    if (!this.state.selectedModel) {
      console.error("❌ No model selected");
      this.setState((prevState) => ({
        messages: [
          ...prevState.messages,
          {
            id: `bot-err-${Date.now()}`,
            text: "Please select a model first.",
            sender: "bot",
            isError: true,
          },
        ],
      }));
      return;
    }

    // Prevent concurrent requests
    if (this.state.isProcessing) {
      console.log("⚠️ Already processing a request, aborting");
      return;
    }
    this.setState({ isProcessing: true });
    console.log("🔒 Set processing flag to prevent multiple submissions");

    // Create a temporary bot message with typing indicator
    this.setState((prevState) => ({
      messages: [
        ...prevState.messages,
        {
          id: `bot-${Date.now()}`,
          text: "",
          sender: "bot",
          isTyping: true,
        },
      ],
    }));

    try {
      console.log(`🌐 Sending request with model: ${this.state.selectedModel}`);
      this.abortControllerRef.current = new AbortController();

      const response = await fetch("/api/chatlilypad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.state.selectedModel,
          message: currentMessage,
        }),
        signal: this.abortControllerRef.current.signal,
      });

      console.log(`🔍 Response status: ${response.status}`);
      if (!response.ok) {
        console.error(`❌ Server error: ${response.status}`);
        throw new Error(`Server error: ${response.status}`);
      }

      console.log("✅ Response started, setting up reader");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let chunkCount = 0;
      let lastUpdateTime = Date.now();
      const minUpdateInterval = 20; // More frequent updates for smoother appearance

      // If no content arrives within 10s, log a warning
      let noContentTimer = setTimeout(() => {
        console.log(
          "⏱️ No content received in 10 seconds, checking connection"
        );
      }, 10000);

      // Stream processing loop
      let streamComplete = false;
      while (!streamComplete) {
        try {
          console.log(`📖 Reading chunk #${chunkCount + 1}`);
          const { done, value } = await reader.read();

          if (done) {
            console.log(`🏁 Stream complete after ${chunkCount} chunks`);
            clearTimeout(noContentTimer);
            streamComplete = true;
            break;
          }

          clearTimeout(noContentTimer);
          chunkCount++;

          const chunk = decoder.decode(value, { stream: true });
          console.log(
            `📦 Raw chunk #${chunkCount}: "${chunk.substring(
              0,
              Math.min(30, chunk.length)
            )}${chunk.length > 30 ? "..." : ""}"`
          );
          console.log(`📋 Chunk length: ${chunk.length} chars`);

          // Debug - check for newlines and special characters
          if (chunk.includes("\n")) {
            console.log(
              `🔍 Chunk contains newlines: positions ${[...chunk]
                .map((c, i) => (c === "\n" ? i : null))
                .filter((i) => i !== null)
                .join(", ")}`
            );
          }

          if (chunk && chunk.length > 0) {
            fullText += chunk;

            // Update the UI more frequently to show streaming text
            const now = Date.now();
            if (now - lastUpdateTime >= minUpdateInterval) {
              console.log(
                `📃 Updating UI with text (${fullText.length} chars)`
              );
              this.setState((prevState) => {
                const newMessages = [...prevState.messages];
                // Find the last bot message
                const lastIndex = newMessages
                  .map((m) => m.sender)
                  .lastIndexOf("bot");

                if (lastIndex !== -1) {
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    text: fullText,
                    isTyping: true,
                    latestChunk: chunk,
                    timestamp: now,
                  };
                }
                return { messages: newMessages };
              });
              lastUpdateTime = now;
            }

            // Reset the no-content timer for the next chunk
            noContentTimer = setTimeout(() => {
              console.log(
                "⏱️ No new content received in 5s, checking if complete"
              );
            }, 5000);
          } else {
            console.log("⚠️ Empty chunk received, ignoring");
          }
        } catch (readError) {
          console.error("❌ Error reading from stream:", readError);
          streamComplete = true;
          break;
        }
      }

      // Final update: remove typing and finalize text
      console.log(
        "✅ Finalizing message with full text length:",
        fullText.length
      );

      // Sample of received content for debugging
      if (fullText.length > 0) {
        console.log(
          `📝 Sample of first 100 chars: "${fullText.substring(0, 100)}..."`
        );
        console.log(
          `📝 Sample of last 100 chars: "...${fullText.substring(
            Math.max(0, fullText.length - 100)
          )}"`
        );
      }

      this.setState((prevState) => {
        const newMessages = [...prevState.messages];
        const lastIndex = newMessages.map((m) => m.sender).lastIndexOf("bot");

        if (lastIndex !== -1) {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            text:
              fullText || "I couldn't generate a response. Please try again.",
            isTyping: false,
            isFinal: true,
          };
        }
        return { messages: newMessages };
      });
    } catch (error) {
      console.error("❌ Error during chat response:", error);
      if (error.name !== "AbortError") {
        this.setState((prevState) => {
          const newMessages = [...prevState.messages];
          const lastIndex = newMessages.map((m) => m.sender).lastIndexOf("bot");
          if (
            lastIndex !== -1 &&
            newMessages[lastIndex].isTyping &&
            !newMessages[lastIndex].isFinal
          ) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              text: `Error: ${
                error.message || "Something went wrong. Please try again."
              }`,
              isTyping: false,
              isError: true,
            };
          } else {
            newMessages.push({
              id: `bot-err-${Date.now()}`,
              text: `Error: ${
                error.message || "Something went wrong. Please try again."
              }`,
              sender: "bot",
              isError: true,
            });
          }
          return { messages: newMessages };
        });
      } else {
        console.log("⚠️ Request was aborted intentionally");
      }
    } finally {
      console.log("🔓 Request process complete, releasing processing lock");
      this.setState({ isProcessing: false });
      this.abortControllerRef.current = null;
    }
  }

  render() {
    const { models, selectedModel, showModelDialog, isProcessing, messages } =
      this.state;
    return (
      <div className="flex flex-col h-screen p-4">
        <h1 className="text-3xl font-bold text-center my-4">Nexamind Chat</h1>
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          {/* Model Selection */}
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
              onClick={this.toggleModelDialog}
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md"
            >
              Select Model
            </button>
          </div>

          {/* Model Dialog */}
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
                        onClick={() => this.handleModelSelect(model)}
                        className="p-2 border rounded-md cursor-pointer hover:bg-gray-100"
                      >
                        {model}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={this.toggleModelDialog}
                    className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 border rounded-lg p-4 bg-gray-50 overflow-y-auto">
            <div className="p-4">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center">
                  No messages yet. Start chatting!
                </p>
              ) : (
                messages.map((msg, index) => (
                  <Message key={msg.id || `msg-${index}`} message={msg} />
                ))
              )}
              <div ref={this.messagesEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <ChatInput
            onSend={this.handleSendMessage}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    );
  }
}

export default Page;
