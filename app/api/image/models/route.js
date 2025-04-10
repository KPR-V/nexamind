import { NextResponse } from "next/server";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function GET() {
  try {
    const response = await axios.get(
      "https://anura-testnet.lilypad.tech/api/v1/image/models",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LILYPAD_API_KEY}`,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error) {
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
