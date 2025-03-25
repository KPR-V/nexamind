import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function POST(request) {
  console.log("📥 Received request to chatlilypad endpoint");
  try {
    const { model, message } = await request.json();
    console.log(`📋 Processing request with model: ${model}`);
    console.log(
      `💬 User message: "${message.substring(0, 50)}${
        message.length > 50 ? "..." : ""
      }"`
    );

    // Create a stream that forwards chunks as they arrive
    const stream = new ReadableStream({
      async start(controller) {
        console.log("🔄 Starting stream controller");

        // Track controller state to prevent "already closed" errors
        let isControllerClosed = false;

        try {
          console.log("🌐 Sending request to Lilypad API");
          const response = await axios.post(
            "https://anura-testnet.lilypad.tech/api/v1/chat/completions",
            {
              model: model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a helpful assistant. You will answer the user's queries in detail and in an explanatory manner.",
                },
                {
                  role: "user",
                  content: message,
                },
              ],
              stream: true,
              temperature: 0.4,
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.LILYPAD_API_KEY}`,
                Accept: "text/event-stream",
              },
              responseType: "stream",
            }
          );
          console.log("✅ Successfully connected to Lilypad API");

          const encoder = new TextEncoder();

          // Track whether we've sent any real content
          let hasSentContent = false;
          let totalContentLength = 0;
          let receivedContentLength = 0;

          // We'll store partial SSE events in `buffer` until we see "\n\n"
          let buffer = "";

          // Store all raw content for debugging purposes
          let allReceivedContent = "";

          // Helper to send text to the client, preserving all formatting
          async function sendChunkedText(text, chunkSize = 16, delayMs = 0) {
            if (!text) return;

            // This preserves newlines and special characters
            for (let i = 0; i < text.length; i += chunkSize) {
              // Check controller state before attempting to send data
              if (isControllerClosed) {
                console.log(
                  "⚠️ Controller closed, stopping chunk transmission"
                );
                return;
              }

              const part = text.substring(i, i + chunkSize);
              try {
                controller.enqueue(encoder.encode(part));
                console.log(`🔤 Sent chunk (${part.length} chars)`);
                if (part.includes("\n")) {
                  console.log(
                    `📃 Chunk contains newlines: ${JSON.stringify(part)}`
                  );
                }
                totalContentLength += part.length;
                hasSentContent = true;

                // Minimal or no delay for smoother streaming
                if (
                  i + chunkSize < text.length &&
                  !isControllerClosed &&
                  delayMs > 0
                ) {
                  await new Promise((res) => setTimeout(res, delayMs));
                }
              } catch (err) {
                console.error("❌ Error enqueueing chunk:", err.message);
                isControllerClosed = true;
                return;
              }
            }
          }

          // Process the response stream
          response.data.on("data", async (chunk) => {
            // Skip processing if controller is closed
            if (isControllerClosed) {
              console.log("⚠️ Skipping chunk processing - controller closed");
              return;
            }

            const chunkString = chunk.toString();
            receivedContentLength += chunkString.length;
            allReceivedContent += chunkString;

            console.log(`🔍 Received raw chunk (${chunkString.length} chars)`);
            if (chunkString.includes("\n")) {
              console.log(
                `📄 Chunk contains newlines, sample: ${chunkString.substring(
                  0,
                  Math.min(50, chunkString.length)
                )}`
              );
            }

            // Append to our running buffer
            buffer += chunkString;

            // SSE events are separated by a blank line "\n\n"
            let sseEvents = buffer.split("\n\n");

            // The last element in `sseEvents` might be incomplete, so store it back in `buffer`
            buffer = sseEvents.pop() || "";

            // Now process each complete SSE event
            for (const evt of sseEvents) {
              if (isControllerClosed) break;

              const trimmed = evt.trim();
              if (!trimmed) continue;

              // If we see "data: [DONE]", that signals the end
              if (trimmed === "data: [DONE]") {
                console.log("🏁 Received completion marker from Lilypad");
                continue;
              }

              // Extract data lines
              const lines = trimmed.split("\n");
              let dataLine = lines.find((l) => l.startsWith("data: "));
              if (!dataLine) continue;

              const jsonStr = dataLine.substring(6).trim();
              if (!jsonStr) continue;

              let jsonData;
              try {
                jsonData = JSON.parse(jsonStr);
              } catch (err) {
                console.log("⚠️ JSON parse error in SSE event:", err.message);
                continue;
              }

              // Process the parsed data
              if (jsonData?.choices?.length) {
                const choice = jsonData.choices[0];

                // If there's delta content, send it exactly as received (preserving formatting)
                if (choice?.delta?.content) {
                  const content = choice.delta.content;
                  console.log(
                    `📤 Sending delta content (${content.length} chars)`
                  );
                  if (content.includes("\n")) {
                    console.log(
                      `📃 Content contains newlines: ${JSON.stringify(
                        content.substring(0, Math.min(100, content.length))
                      )}`
                    );
                  }
                  await sendChunkedText(content);
                }
                // If there's a final message content
                else if (choice?.message?.content) {
                  const content = choice.message.content;
                  console.log(
                    `🎯 Received final content (${
                      content.length
                    } chars): "${content.slice(0, 60)}..."`
                  );
                  await sendChunkedText(content);
                }

                if (choice?.finish_reason) {
                  console.log(`🛑 Finish reason: ${choice.finish_reason}`);
                }
              }
            }
          });

          // When the stream ends
          response.data.on("end", async () => {
            console.log(
              `🎉 Stream completed. Content sent: ${totalContentLength} chars, Received: ${receivedContentLength} chars`
            );

            // Debug - show sample of all received content
            console.log(`📚 Sample of all received content (first 200 chars): 
${allReceivedContent.substring(0, 200)}
--- end of sample ---`);

            // Only send fallback if no content was sent and controller is still open
            if (!hasSentContent && !isControllerClosed) {
              console.log("⚠️ No content was sent, sending fallback message");
              try {
                const fallbackMsg =
                  "I'm having trouble generating a response right now. Please try again.";
                await sendChunkedText(fallbackMsg);
              } catch (err) {
                console.error(
                  "❌ Error sending fallback message:",
                  err.message
                );
              }
            }

            // Check for incomplete buffer data at the end
            if (buffer.trim() && !isControllerClosed) {
              console.log(
                `⚠️ Incomplete buffer data remains (${buffer.length} chars), attempting to process`
              );
              try {
                // Try to extract any remaining data from the buffer
                if (buffer.includes("data: ")) {
                  const dataLine = buffer
                    .split("\n")
                    .find((l) => l.startsWith("data: "));
                  if (dataLine) {
                    const jsonStr = dataLine.substring(6).trim();
                    if (jsonStr && jsonStr !== "[DONE]") {
                      try {
                        const jsonData = JSON.parse(jsonStr);
                        if (jsonData?.choices?.[0]?.delta?.content) {
                          await sendChunkedText(
                            jsonData.choices[0].delta.content
                          );
                        } else if (jsonData?.choices?.[0]?.message?.content) {
                          await sendChunkedText(
                            jsonData.choices[0].message.content
                          );
                        }
                      } catch (e) {
                        console.log(
                          "⚠️ Could not parse remaining buffer JSON:",
                          e.message
                        );
                      }
                    }
                  }
                }
              } catch (bufferErr) {
                console.error(
                  "❌ Error processing remaining buffer:",
                  bufferErr
                );
              }
            }

            // Only close if not already closed, with a slight delay to ensure all data is sent
            if (!isControllerClosed) {
              try {
                // Small delay before closing to ensure all data is sent
                await new Promise((resolve) => setTimeout(resolve, 500));
                controller.close();
                isControllerClosed = true;
                console.log("🔒 Controller closed successfully");
              } catch (err) {
                console.error("❌ Error closing controller:", err.message);
                isControllerClosed = true;
              }
            }
          });

          response.data.on("error", (err) => {
            console.error("❌ Stream error:", err);
            if (!isControllerClosed) {
              try {
                controller.error(err);
                isControllerClosed = true;
              } catch (controllerErr) {
                console.error(
                  "❌ Error signaling controller error:",
                  controllerErr
                );
                isControllerClosed = true;
              }
            }
          });
        } catch (error) {
          console.error("❌ Error starting stream:", error);
          if (error.response) {
            console.error(
              "📡 API response error:",
              error.response.status,
              error.response.data
            );
          } else if (error.request) {
            console.error("📡 No response received:", error.request);
          } else {
            console.error("🔧 Request configuration error:", error.message);
          }

          if (!isControllerClosed) {
            try {
              controller.error(error);
              isControllerClosed = true;
            } catch (controllerErr) {
              console.error(
                "❌ Error signaling controller error:",
                controllerErr
              );
              isControllerClosed = true;
            }
          }
        }
      },
    });

    console.log("📤 Returning stream response to client");
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ Fatal API route error:", error);

    // Error handling for the overall request
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(
          `❌ Server error ${error.response.status}:`,
          error.response.data
        );
        return NextResponse.json(
          {
            error: "Server Error",
            status: error.response.status,
            message: error.response.data,
          },
          { status: error.response.status }
        );
      } else if (error.request) {
        console.error("❌ Network error - no response received");
        return NextResponse.json(
          {
            error: "Network Error",
            message: "No response received from server",
          },
          { status: 503 }
        );
      } else {
        console.error("❌ Request configuration error:", error.message);
        return NextResponse.json(
          {
            error: "Request Error",
            message: error.message,
          },
          { status: 400 }
        );
      }
    }
    console.error("❌ Unknown error type:", error.message);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
