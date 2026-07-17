export default async function handler(req, res) {
  // Allow requests from your website
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Change the URL to target Groq's official API
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 2. Expect a GROQ_API_KEY environment variable instead of Gemini
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          // 3. Use one of Groq's flagship fast models
          model: "llama-3.1-70b-versatile",
          // 4. Adapt the layout format to fit Groq's standard Chat JSON structure
          messages: [
            {
              role: "system",
              content: "You are an expert AI Interview Coach. Your goal is to analyze famous real-world interviews from top companies across various career fields. Generate highly specialized technical, behavioral, or situational questions based on that analysis to thoroughly prepare candidates."
            },
            {
              role: "user",
              content: JSON.stringify(req.body)
            }
          ],
          temperature: 0.7
        })
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
