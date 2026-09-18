export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type WebSearchResponse = {
  provider: "tavily";
  results: WebSearchResult[];
};

export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("web_search_not_configured");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: Math.min(Math.max(maxResults, 1), 10),
      search_depth: "advanced",
      include_answer: false,
      include_raw_content: false
    })
  });

  if (!response.ok) throw new Error(`web_search_provider_error_${response.status}`);
  const data = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string }> };

  return {
    provider: "tavily",
    results: (data.results ?? []).map(item => ({
      title: item.title ?? "",
      url: item.url ?? "",
      snippet: item.content ?? ""
    })).filter(item => item.url)
  };
}
