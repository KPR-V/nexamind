import { NextResponse } from "next/server";
import { searchWeb } from "../../../utils/toolFunctions";

export async function POST(request) {
  try {
    const { tool, parameters } = await request.json();
    let result;
    switch (tool) {
      case "search_web":
        result = await searchWeb(parameters.query, parameters.num_results);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown tool: ${tool}` },
          { status: 400 }
        );
    }
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error executing tool:", error);
    return NextResponse.json(
      { error: "Failed to execute tool", message: error.message },
      { status: 500 }
    );
  }
}
