import axios from "axios";

export const API_ROUTES = {
  webSearch: "execute-tool",
  imageModels: "image/models",
  imageGeneration: "image/generate",
};

export async function webSearch(query: string, num_results: number = 5) {
  try {
    console.log("Executing web search with parameters:", {
      query,
      num_results,
    });

    const response = await axios.post(`/api/${API_ROUTES.webSearch}`, {
      tool: "search_web",
      parameters: {
        query,
        num_results: num_results || 5,
      },
    });

    const result = response.data.result;

    if (result && typeof result === "object" && "error" in result) {
      console.warn("Web search API returned an error:", result.error);
      return `I couldn't find any relevant information for your query through web search. Error: ${result.error}. Please try a different search term or approach.`;
    }

    if (!result || result === "undefined" || result === "") {
      console.warn("Web search returned empty result");
      return "I couldn't find any relevant information for your query through web search. Please try a different search term or approach.";
    }

    if (result && typeof result === "object" && "results" in result) {
      const results = result.results || [];
      if (results.length === 0) {
        return "The web search didn't find any relevant results for your query. Please try different search terms.";
      }

      let formattedResponse = `Here's what I found on the web for "${query}":\n\n`;

      results.forEach((result: any, index: any) => {
        formattedResponse += `${index + 1}. ${result.title}\n`;
        formattedResponse += `   ${
          result.snippet || "No description available"
        }\n`;
        formattedResponse += `   Source: ${result.url}\n\n`;
      });

      return formattedResponse;
    }

    return result;
  } catch (error) {
    console.error("Error in web search:", error);
    return "I encountered an issue while searching the web. Please try again with a different query.";
  }
}

export async function generateImage(model: string, prompt: string) {
  try {
    const response = await axios.post(`/api/${API_ROUTES.imageGeneration}`, {
      model,
      prompt,
    });

    return response.data.imageUrl;
  } catch (error) {
    console.error("Error generating image:", error);
    return "I encountered an issue while generating the image. Please try again with a different prompt.";
  }
}

export async function getAvailableImageModels() {
  try {
    const response = await axios.get(`/api/${API_ROUTES.imageModels}`);
    return response.data.data.models;
  } catch (error) {
    console.error("Error fetching image models:", error);
    return [];
  }
}
