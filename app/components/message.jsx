"use client";
import React, { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const Message = memo(({ message, toolsUsed = [] }) => {
  const { text, sender, isTyping, isError, imageUrl } = message;
  const isBot = sender === "bot";
  const messageRef = useRef(null);
  const [visibleText, setVisibleText] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatText = (text) => {
    if (!text) return "";
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    escaped = escaped.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline dark:text-blue-400">$1</a>'
    );

    const lines = escaped.split("\n");
    let inTable = false;
    let tableContent = [];
    let processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const pipeCount = (line.match(/\|/g) || []).length;

      if (pipeCount >= 2) {
        if (!inTable) {
          inTable = true;
          tableContent = [line];
        } else {
          tableContent.push(line);
        }
      } else if (inTable) {
        if (tableContent.length >= 2) {
          processedLines.push(processTableContent(tableContent));
        } else {
          processedLines = processedLines.concat(tableContent);
        }
        inTable = false;
        tableContent = [];
        processedLines.push(line);
      } else {
        processedLines.push(line);
      }
    }

    if (inTable && tableContent.length >= 2) {
      processedLines.push(processTableContent(tableContent));
    } else if (inTable) {
      processedLines = processedLines.concat(tableContent);
    }

    escaped = processedLines.join("\n");

    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    escaped = escaped.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    escaped = escaped.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>'
    );

    escaped = escaped.replace(/``````/g, function (match, lang, code) {
      return `<div class="bg-gray-100 dark:bg-gray-800 rounded-md p-4 my-4 overflow-x-auto"><pre><code class="language-${
        lang || ""
      }">${code}</code></pre></div>`;
    });

    escaped = escaped.replace(
      /^###\s+(.+)$/gm,
      '<h3 class="text-lg font-bold my-2">$1</h3>'
    );
    escaped = escaped.replace(
      /^##\s+(.+)$/gm,
      '<h2 class="text-xl font-bold my-3">$1</h2>'
    );
    escaped = escaped.replace(
      /^#\s+(.+)$/gm,
      '<h1 class="text-2xl font-bold my-4">$1</h1>'
    );

    escaped = escaped.replace(/(\n\d+\.\s+.+)+/g, function (match) {
      const items = match
        .trim()
        .split("\n")
        .map((item) => {
          return '<li class="ml-5">' + item.replace(/^\d+\.\s+/, "") + "</li>";
        });
      return '<ol class="list-decimal my-2 ml-2">' + items.join("") + "</ol>";
    });

    escaped = escaped.replace(/(\n-\s+.+)+/g, function (match) {
      const items = match
        .trim()
        .split("\n")
        .map((item) => {
          return '<li class="ml-5">' + item.replace(/^-\s+/, "") + "</li>";
        });
      return '<ul class="list-disc my-2 ml-2">' + items.join("") + "</ul>";
    });

    escaped = escaped.replace(/\n\n/g, '</p><p class="my-2">');
    escaped = escaped.replace(/\n/g, "<br>");

    if (
      !escaped.startsWith("<h") &&
      !escaped.startsWith("<ol") &&
      !escaped.startsWith("<ul") &&
      !escaped.startsWith("<div") &&
      !escaped.startsWith("<p")
    ) {
      escaped = '<p class="my-2">' + escaped + "</p>";
    }

    return escaped;
  };

  const processTableContent = (tableRows) => {
    let tableHTML =
      '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-300 dark:border-gray-700">';

    tableRows.forEach((row, rowIndex) => {
      const cells = row.split("|").filter((cell) => cell !== "");

      if (rowIndex === 0) {
        tableHTML += '<thead class="bg-gray-100 dark:bg-gray-800"><tr>';
        cells.forEach((cell) => {
          tableHTML += `<th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">${cell.trim()}</th>`;
        });
        tableHTML += "</tr></thead><tbody>";
      } else if (rowIndex === 1 && row.includes("---")) {
        return;
      } else {
        tableHTML += '<tr class="hover:bg-gray-50 dark:hover:bg-gray-900">';
        cells.forEach((cell) => {
          tableHTML += `<td class="border border-gray-300 dark:border-gray-700 px-4 py-2">${cell.trim()}</td>`;
        });
        tableHTML += "</tr>";
      }
    });

    tableHTML += "</tbody></table></div>";
    return tableHTML;
  };

  useEffect(() => {
    setVisibleText(text);
  }, [text]);

  useEffect(() => {
    if (isBot && messageRef.current) {
      messageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [visibleText, isBot, imageLoaded]);

  return (
    <motion.div
      ref={messageRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-lg my-3 shadow-sm max-w-[85%] ${
        isBot
          ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          : "bg-blue-500 dark:bg-blue-600 text-white ml-auto"
      } ${isTyping ? "animate-pulse" : ""} ${
        isError
          ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
          : ""
      }`}
    >
      {isTyping && !text ? (
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      ) : (
        <>
          <div
            className="whitespace-pre-wrap break-words text-formatting"
            dangerouslySetInnerHTML={{ __html: formatText(visibleText) }}
          />

          {imageUrl && (
            <div className={`mt-3 relative ${imageError ? "hidden" : ""}`}>
              {!imageLoaded && (
                <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                    />
                  </svg>
                </div>
              )}
              <Image
                src={imageUrl}
                alt="Generated image"
                width={512}
                height={512}
                className={`rounded-lg border border-gray-200 dark:border-gray-700 mt-2 max-w-full h-auto ${
                  !imageLoaded ? "hidden" : ""
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {imageError && (
                <div className="text-red-500 dark:text-red-400 text-sm mt-1">
                  Failed to load image. The image may have expired or been
                  removed.
                </div>
              )}
            </div>
          )}

          {/* Tool Usage Indicator */}
          {toolsUsed && toolsUsed.length > 0 && isBot && (
            <div className="mt-2 flex flex-wrap gap-2">
              {toolsUsed.includes("search_web") && (
                <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full flex items-center">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Web Search
                </div>
              )}
              {toolsUsed.includes("get_weather") && (
                <div className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full flex items-center">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                    />
                  </svg>
                  Weather Info
                </div>
              )}
            </div>
          )}

          {isError && (
            <div className="flex items-center mt-2">
              <svg
                className="w-5 h-5 mr-2 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">Error occurred during processing</span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
});

Message.displayName = "Message";
export default Message;
