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

export function needsWebSearch(query) {
  
  const currentInfoKeywords = [
    'current', 'latest', 'recent', 'today', 'now', 'news',
    'update', 'trend', 'weather', 'price', 'stock', 'event',
    'happening', 'release', 'launch', 'announced', 'published'
  ];
  
  
  const factualQuestionPatterns = [
    /^who is/i, /^what is/i, /^when is/i, /^where is/i, /^why is/i, /^how to/i,
    /^tell me about/i, /^find/i, /^search for/i, /^lookup/i, /\?$/
  ];
  
  
  const queryLower = query.toLowerCase();
  if (currentInfoKeywords.some(keyword => queryLower.includes(keyword))) {
    return true;
  }
  
 
  if (factualQuestionPatterns.some(pattern => pattern.test(query))) {
    return true;
  }
  
  return false;
}


export async function anuraWebSearch(query, numResults = 3) {
  try {
    const response = await axios.post(
      "https://anura-testnet.lilypad.tech/api/v1/websearch",
      {
        query: query,
        number_of_results: numResults
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.LILYPAD_API_KEY}`
        }
      }
    );
    
    return {
      query,
      results: response.data.results.map(item => ({
        title: item.title,
        snippet: item.description,
        url: item.url,
        displayUrl: new URL(item.url).hostname
      })),
      related_queries: response.data.related_queries,
      count: response.data.count
    };
  } catch (error) {
    console.error("Error using Anura web search:", error);
    return {
      error: "Failed to search the web using Anura API",
      message: error.message
    };
  }
}