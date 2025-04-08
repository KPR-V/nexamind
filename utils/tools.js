export const chatTools = [
  {
    type: "function",
    function: {
      name: "searchWeb",
      description:
        "Search the web for current information on a topic or query. Use this when you need up-to-date information or facts that might not be in your training data.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up on the web",
          },
          num_results: {
            type: "integer",
            description:
              "Number of search results to return (default: 10, max: 15)",
          },
        },
        required: ["query"],
      },
    },
  },
];
