import { NextResponse } from "next/server";
import axios from "axios";
import dotenv from "dotenv";
import { chatTools } from "../../../utils/tools";
import { searchWeb } from "../../../utils/toolFunctions";
dotenv.config();

const toolSupportedModels = [
  "llama3.1:8b",
  "qwen2.5:7b",
  "qwen2.5-coder:7b",
  "phi4-mini:3.8b",
  "mistral:7b",
];

export async function POST(request) {
  // console.time("Total response time");
  // console.log("📥 Received request to chatlilypad endpoint");
  try {
    const {
      model,
      message,
      conversation = [],
      enableTools = true,
    } = await request.json();
    // console.log(`📋 Processing request with model: ${model}`);
    // console.log(
    //   `💬 User message: "${message.substring(0, 50)}${
    //     message.length > 50 ? "..." : ""
    //   }"`
    // );

    const modelSupportsTools = toolSupportedModels.includes(model);
    const useTools = modelSupportsTools && enableTools;

    let messages = [];

    messages.push({
      role: "system",
      content:
        "You are a helpful assistant. You will answer the user's queries in detail and in an explanatory manner. Use tools when appropriate to provide accurate information. and also when you dont have information about the query.",
    });

    if (conversation && conversation.length > 0) {
      messages = [...messages, ...conversation];
    }

    messages.push({ role: "user", content: message });

    const payload = {
      model,
      messages,
      temperature: 0.5,
    };

    if (useTools) {
      payload.tools = chatTools;
    }

    const initialResponse = await axios.post(
      "https://anura-testnet.lilypad.tech/api/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LILYPAD_API_KEY}`,
        },
      }
    );

    const assistantMessage = initialResponse.data.choices[0].message;
    const hasTool =
      assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0;

    if (hasTool) {
      // console.log("🔧 Tool calls detected");
      const toolsUsed = [];

      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const {
          id,
          function: { name, arguments: argsString },
        } = toolCall;
        const args = JSON.parse(argsString);

        // console.log(`🔧 Executing tool: ${name}`);
        toolsUsed.push(name);

        let toolResult;
        switch (name) {
          case "searchWeb":
            toolResult = await searchWeb(args.query, args.num_results);
            break;
          default:
            toolResult = { error: `Unknown tool: ${name}` };
        }

        messages.push({
          role: "tool",
          tool_call_id: id,
          content: JSON.stringify(toolResult),
        });
      }

      // console.log("🔄 Making second request with tool results");

      const finalResponse = await axios.post(
        "https://anura-testnet.lilypad.tech/api/v1/chat/completions",
        {
          model,
          messages,
          temperature: 0.5,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LILYPAD_API_KEY}`,
          },
        }
      );

      const finalContent = finalResponse.data.choices[0].message.content;
      //  console.timeEnd("Total response time");
      return NextResponse.json({
        content: finalContent,
        toolsUsed: toolsUsed,
        fullConversation: messages,
      });
    } else {
      //  console.timeEnd("Total response time");
      return NextResponse.json({
        content: assistantMessage.content,
        toolsUsed: [],
        fullConversation: [...messages, assistantMessage],
      });
    }
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
