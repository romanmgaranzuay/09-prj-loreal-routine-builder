// Copy this code into your Cloudflare Worker script

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = env.MISTRAL_API_KEY;
    const apiUrl = "https://api.mistral.ai/v1/chat/completions";
    const userInput = await request.json();

    // Debug: Log the incoming request body
    console.log("Incoming request body:", userInput);

    const requestBody = {
      model: "mistral-small-latest",
      messages: userInput.messages,
      max_tokens: 800,
      temperature: 0.5,
      frequency_penalty: 0.8,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  },
};
