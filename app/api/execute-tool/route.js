import { NextResponse } from "next/server";
import { anuraWebSearch } from "../../../utils/toolFunctions";

export async function POST(request) {
  try {
    const body = await request.json();

    const tool = body.tool;
    const parameters = body.parameters || body.params;

    if (!tool) {
      return NextResponse.json(
        { error: "Missing tool parameter" },
        { status: 400 }
      );
    }

    let result;

    switch (tool) {
      case "search_web":
      case "web-search":
      case "web_search":
        result = await anuraWebSearch(
          parameters.query,
          parameters.numresults || parameters.num_results || 9
        );
        break;
      default:
        return NextResponse.json(
          { error: `Unknown tool: ${tool}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      data: result,
      success: true,
    });
  } catch (error) {
    console.error("Error executing tool:", error);
    return NextResponse.json(
      { error: "Failed to execute tool", message: error.message },
      { status: 500 }
    );
  }
}
