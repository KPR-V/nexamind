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

    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false;
        const encoder = new TextEncoder();
        let hasSentContent = false;
        let totalContentLength = 0;
        let receivedContentLength = 0;
        let buffer = "";
        let allReceivedContent = "";

        // Helper function: sends text in chunks with detailed logging and conditional delays
        async function sendChunkedText(text, chunkSize = 16, delayMs = 0) {
          if (!text) return;
          for (let i = 0; i < text.length; i += chunkSize) {
            if (isControllerClosed) {
              console.log("⚠️ Controller closed, stopping chunk transmission");
              return;
            }
            const part = text.substring(i, i + chunkSize);
            try {
              controller.enqueue(encoder.encode(part));
              console.log(
                `🔤 Sent chunk (${part.length} chars): ${JSON.stringify(part)}`
              );
              totalContentLength += part.length;
              hasSentContent = true;
              if (part.includes("\n")) {
                console.log(
                  `📃 Chunk contains newlines: ${JSON.stringify(part)}`
                );
              }
              if (i + chunkSize < text.length && delayMs > 0) {
                console.log(`⏱️ Delaying next chunk for ${delayMs}ms`);
                await new Promise((res) => setTimeout(res, delayMs));
              }
            } catch (err) {
              console.error("❌ Error enqueueing chunk:", err.message);
              isControllerClosed = true;
              return;
            }
          }
        }

        try {
          console.log("🌐 Sending request to Lilypad API");
          const response = await axios.post(
            "https://anura-testnet.lilypad.tech/api/v1/chat/completions",
            {
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a helpful assistant. You will answer the user's queries in detail and in an explanatory manner.",
                },
                { role: "user", content: message },
              ],
              stream: true,
              temperature: 0.4,
            },
            {
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LILYPAD_API_KEY}`,
                "Accept": "text/event-stream",
              },
              responseType: "stream",
            }
          );
          console.log("✅ Connected to Lilypad API");

          response.data.on("data", async (chunk) => {
            if (isControllerClosed) return;
            const chunkString = chunk.toString();
            receivedContentLength += chunkString.length;
            allReceivedContent += chunkString;
            console.log(`🔍 Received raw chunk (${chunkString.length} chars)`);
            if (chunkString.includes("\n")) {
              console.log(
                `📄 Chunk sample with newline: ${chunkString.substring(
                  0,
                  Math.min(50, chunkString.length)
                )}`
              );
            }
            buffer += chunkString;
            const sseEvents = buffer.split("\n\n");
            // The last element might be incomplete; save it back into buffer
            buffer = sseEvents.pop() || "";
            for (const evt of sseEvents) {
              const trimmed = evt.trim();
              if (!trimmed) continue;
              if (trimmed === "data: [DONE]") {
                console.log("🏁 Completion marker received");
                continue;
              }
              const dataLine = trimmed
                .split("\n")
                .find((l) => l.startsWith("data: "));
              if (!dataLine) continue;
              const jsonStr = dataLine.substring(6).trim();
              if (!jsonStr) continue;
              let jsonData;
              try {
                jsonData = JSON.parse(jsonStr);
              } catch (err) {
                console.log(
                  "⚠️ JSON parse error in SSE event, buffering:",
                  err.message
                );
                continue;
              }
              if (jsonData?.choices?.length) {
                const choice = jsonData.choices[0];
                if (choice?.delta?.content) {
                  const content = choice.delta.content;
                  console.log(
                    `📤 Sending delta content (${content.length} chars)`
                  );
                  await sendChunkedText(content);
                } else if (choice?.message?.content) {
                  const content = choice.message.content;
                  console.log(
                    `🎯 Sending final content (${
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

          response.data.on("end", async () => {
            console.log(
              `🎉 Stream ended. Sent: ${totalContentLength} chars, Received: ${receivedContentLength} chars`
            );
            console.log(
              `📚 Received content sample: ${allReceivedContent.substring(
                0,
                200
              )}`
            );
            if (!hasSentContent && !isControllerClosed) {
              console.log("⚠️ No content sent, sending fallback message");
              await sendChunkedText(
                "I'm having trouble generating a response right now. Please try again."
              );
            }
            // Process any remaining data in the buffer
            if (buffer.trim() && !isControllerClosed) {
              console.log(
                `⚠️ Processing remaining buffer (${buffer.length} chars)`
              );
              const dataLine = buffer
                .split("\n")
                .find((l) => l.startsWith("data: "));
              if (dataLine) {
                const jsonStr = dataLine.substring(6).trim();
                if (jsonStr && jsonStr !== "[DONE]") {
                  try {
                    const jsonData = JSON.parse(jsonStr);
                    if (jsonData?.choices?.[0]?.delta?.content) {
                      await sendChunkedText(jsonData.choices[0].delta.content);
                    } else if (jsonData?.choices?.[0]?.message?.content) {
                      await sendChunkedText(
                        jsonData.choices[0].message.content
                      );
                    }
                  } catch (e) {
                    console.log(
                      "⚠️ Could not parse remaining buffer:",
                      e.message
                    );
                  }
                }
              }
            }
            if (!isControllerClosed) {
              await new Promise((res) => setTimeout(res, 500));
              try {
                controller.close();
                isControllerClosed = true;
                console.log("🔒 Controller closed");
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
              } catch (e) {
                console.error(
                  "❌ Error signaling controller error:",
                  e.message
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
            } catch (e) {
              console.error("❌ Error signaling controller error:", e.message);
              isControllerClosed = true;
            }
          }
        }
      },
    });

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
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return NextResponse.json(
          {
            error: "Server Error",
            status: error.response.status,
            message: error.response.data,
          },
          { status: error.response.status }
        );
      } else if (error.request) {
        return NextResponse.json(
          {
            error: "Network Error",
            message: "No response received from server",
          },
          { status: 503 }
        );
      } else {
        return NextResponse.json(
          {
            error: "Request Error",
            message: error.message,
          },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
