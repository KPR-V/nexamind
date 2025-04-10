import { NextResponse } from "next/server";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function POST(request) {
  // console.time("Total response time");
  try {
    const { model, prompt } = await request.json();

    if (!model) {
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // console.log(`📋 Processing image generation with model: ${model}`);
    // console.log(
    //   `🎨 Prompt: "${prompt.substring(0, 50)}${
    //     prompt.length > 50 ? "..." : ""
    //   }"`
    // );

    const response = await axios.post(
      "https://anura-testnet.lilypad.tech/api/v1/image/generate",
      {
        model,
        prompt,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LILYPAD_API_KEY}`,
        },
        responseType: "arraybuffer",
      }
    );

    // console.timeEnd("Total response time");
    return new Response(response.data, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("❌ Error generating image:", error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        return NextResponse.json(
          {
            error: "Image Generation Error",
            status: error.response.status,
            message: error.response?.data
              ? Buffer.from(error.response.data).toString("utf8")
              : "Unknown server error",
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
