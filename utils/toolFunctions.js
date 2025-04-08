import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function searchWeb(query, numResults = 3) {
  try {
    const limit = Math.min(Math.max(1, numResults || 10), 15);
    const response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      {
        params: {
          key: process.env.GOOGLE_SEARCH_API_KEY,
          cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
          q: query,
          num: limit,
        },
      }
    );
    const results = response.data.items.map((item) => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      displayUrl: item.displayLink,
      date: item.pagemap?.metatags?.[0]?.["article:published_time"] || null,
    }));
    return {
      query,
      results,
      total_results: response.data.searchInformation.totalResults,
      search_time: response.data.searchInformation.searchTime,
    };
  } catch (error) {
    console.error("Error searching web:", error);
    if (error.response?.status === 429 || error.response?.status === 403) {
      return {
        error: "API limit reached or access denied",
        message: error.message,
      };
    }
    return {
      error: "Failed to search the web",
      message: error.message,
    };
  }
}
