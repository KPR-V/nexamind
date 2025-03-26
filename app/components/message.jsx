"use client";
import React, { memo, useEffect, useRef, useState } from "react";

const Message = memo(({ message }) => {
  const { text, sender, isTyping, isError } = message;
  const isBot = sender === "bot";
  const messageRef = useRef(null);
  const [visibleText, setVisibleText] = useState("");

  const formatText = (text) => {
    if (!text) return "";

    // Escape HTML characters first
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Handle links - [text](url)
    escaped = escaped.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
    );

    // Handle tables - Completely rewritten to avoid regex issues
    const lines = escaped.split('\n');
    let inTable = false;
    let tableContent = [];
    let processedLines = [];

    // Process the text line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line looks like a table row (has at least 2 pipe characters)
      const pipeCount = (line.match(/\|/g) || []).length;
      
      if (pipeCount >= 2) {
        // This line appears to be part of a table
        if (!inTable) {
          // Starting a new table
          inTable = true;
          tableContent = [line];
        } else {
          // Continue the current table
          tableContent.push(line);
        }
      } else if (inTable) {
        // This line is not a table row, but we were in a table
        // Process the collected table
        if (tableContent.length >= 2) {
          // Only process as a table if we have at least 2 rows (header + data)
          processedLines.push(processTableContent(tableContent));
        } else {
          // Not enough rows to be a table, add the original content
          processedLines = processedLines.concat(tableContent);
        }
        
        // Reset table state and add the current line
        inTable = false;
        tableContent = [];
        processedLines.push(line);
      } else {
        // Regular line, not in a table
        processedLines.push(line);
      }
    }
    
    // If we ended while still processing a table
    if (inTable && tableContent.length >= 2) {
      processedLines.push(processTableContent(tableContent));
    } else if (inTable) {
      processedLines = processedLines.concat(tableContent);
    }
    
    // Rejoin the processed lines
    escaped = processedLines.join('\n');

    // Format headings and other elements as before
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"); // Bold text
    escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>"); // Italic text

    // Handle headings
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

    // Handle lists (both numbered and bulleted)
    // First, identify list blocks
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

    // Handle paragraphs
    escaped = escaped.replace(/\n\n/g, '</p><p class="my-2">');

    // Handle regular line breaks for remaining newlines
    escaped = escaped.replace(/\n/g, "<br>");

    // Wrap in paragraph if not done already
    if (
      !escaped.startsWith("<h") &&
      !escaped.startsWith("<ol") &&
      !escaped.startsWith("<ul") &&
      !escaped.startsWith("<div") // For tables
    ) {
      escaped = '<p class="my-2">' + escaped + "</p>";
    }

    return escaped;
  };

  // Helper function to process table content
  const processTableContent = (tableRows) => {
    let tableHTML = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-300">';
    
    // Process each row
    tableRows.forEach((row, rowIndex) => {
      // Split the row by pipe character and remove empty cells at the beginning and end
      const cells = row.split('|').filter(cell => cell !== '');
      
      if (rowIndex === 0) {
        // Header row
        tableHTML += '<thead><tr>';
        cells.forEach(cell => {
          tableHTML += `<th class="border border-gray-300 px-4 py-2 bg-gray-100">${cell.trim()}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';
      } else if (rowIndex === 1 && row.includes('---')) {
        // This is a separator row (markdown style), skip it
        return;
      } else {
        // Data row
        tableHTML += '<tr>';
        cells.forEach(cell => {
          tableHTML += `<td class="border border-gray-300 px-4 py-2">${cell.trim()}</td>`;
        });
        tableHTML += '</tr>';
      }
    });
    
    tableHTML += '</tbody></table></div>';
    return tableHTML;
  };

  useEffect(() => {
    setVisibleText(text);
  }, [text]);

  useEffect(() => {
    if (isBot && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleText, isBot]);

  return (
    <div
      ref={messageRef}
      className={`p-4 rounded-lg my-2 ${
        isBot
          ? isError
            ? "bg-red-100 text-red-800"
            : "bg-gray-100"
          : "bg-blue-500 text-white ml-auto"
      } ${isTyping ? "animate-pulse" : ""}`}
    >
      {isTyping && !text ? (
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-400" />
        </div>
      ) : (
        <div
          className="whitespace-pre-wrap break-words text-formatting"
          dangerouslySetInnerHTML={{ __html: formatText(visibleText) }}
        />
      )}
    </div>
  );
});

Message.displayName = "Message";
export default Message;
