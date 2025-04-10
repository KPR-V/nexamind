import { NextResponse } from "next/server";
import { create } from "@web3-storage/w3up-client";

// Create a Web3Storage client
const client = new create({
  token: process.env.NEXT_PUBLIC_STORACHA_API_TOKEN,
});

export async function POST(request) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case "verify-storage":
        // Verify a CID is still stored
        const status = await client.status(data.cid);
        return NextResponse.json({ status });

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Storacha API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
