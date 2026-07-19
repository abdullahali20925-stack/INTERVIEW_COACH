export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight routing checks
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST requests accepted." }), {
        status: 405,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    try {
      const payload = await request.json();
      const { action, role, difficulty, count, question, answer } = payload;
      
      let systemPrompt = "";
      let userPrompt = "";

      if (action === "generate_interview") {
        systemPrompt = `You are an elite executive senior recruiter with over 20 years of hiring experience at world-class companies including Google, Microsoft, Amazon, Meta, Apple, Netflix, Tesla, NVIDIA, OpenAI, Stripe, Goldman Sachs, Deloitte, PwC, EY, KPMG, McKinsey, and BCG.

Your objective is to generate completely original, high-quality interview questions modeled after the rigorous corporate standards, structural depth, and intellectual difficulty of these elite firms. Never copy real questions verbatim. Every question must feel authentic, contextual, and dynamic.

Tailor the interview balance specifically for the role of: "${role}".
Consider:
- Core skills, modern techniques, responsibilities, and industry standards.
- Software Engineers need deep dives into: Data Structures, Algorithms, Scale, System Design, Architecture, and APIs.
- Data Analysts need: SQL, Analytics, Python, Statistics, Dashboard insights.
- PMs need: Leadership, Risk, Stakeholder alignment, Agile.
- If a custom role is provided, infer the required modern core skills before writing questions.

Difficulty Tier Strategy:
- beginner: Targeted for students/graduates. Emphasize potential, baseline theory, structural drive, and foundational core knowledge.
- intermediate: Targeted for 2-5 years experience. Emphasize optimization, handling complexity, tracking cross-functional errors, and metrics.
- advanced: Targeted for seniors/leaders. Emphasize enterprise strategy, systemic risk mitigation, scalable choices, architecture, and team evolution blocks.

Generate exactly ${count || 5} questions. Choose a diverse breakdown across categories: Introduction, Behavioral, Situational, Technical, Scenario-Based, Problem Solving, Decision Making, Communication, Leadership, or Role-Specific Knowledge. Ensure each question has a distinct scenario or wording.

CRITICAL: Return ONLY a valid, parseable JSON object with no markdown styling wrappers, no formatting codeblocks (\`\`\`json), no preamble text, and no closing narrative explanations.

Expected JSON schema layout structure:
{
  "questions": [
    {
      "category": "Technical",
      "difficulty": "${difficulty}",
      "question": "The specific question text goes here..."
    }
  ]
}`;

        userPrompt = `Generate a fresh, unique ${difficulty} level interview containing ${count || 5} questions for a "${role}" position following the requested strict JSON format framework.`;

      } else if (action === "evaluate_answer") {
        systemPrompt = `You are a critical, senior executive talent acquisition partner evaluating a candidate's live interview answer.
Assess the performance accurately based on the candidate's core role competency metrics, Technical Accuracy, Communication, Confidence, Critical Thinking, Strategy, and usage of the STAR Method (Situation, Task, Action, Result). 

Provide a realistic, professional score from 1 to 10.
If the response is weak or incomplete, structure your response to ask a realistic follow-up question or clarification inside the 'suggestions' space to make it feel natural and conversational.

CRITICAL: Return ONLY a valid, parseable JSON object with no markdown styling wrappers, no formatting codeblocks (\`\`\`json), no preamble text, and no closing narrative explanations.

Expected JSON schema layout structure:
{
  "score": 8,
  "strengths": "Granular breakdown highlighting what exactly went well with their specific reasoning.",
  "weaknesses": "Explicit tactical identification of execution or structural flaws, metrics missing, or logical leaps.",
  "suggestions": "Actionable, concrete strategic instructions to improve structure or fill knowledge gaps.",
  "modelAnswer": "An elegant phrasing template illustrating how an elite candidate would frame this specific answer response using metrics.",
  "tags": ["Communication", "Technical Accuracy"]
}`;

        userPrompt = `Role: ${role}
Difficulty Level: ${difficulty}
Question Asked: "${question}"
Candidate Answer: "${answer}"

Provide your professional scored feedback following the requested strict JSON format layout framework.`;
      } else {
        throw new Error("Invalid runtime action router token.");
      }

      // Route parameters to the Groq Chat Completions endpoint
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-8b-8192", // Optimized speed-to-accuracy model choice
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.76, // Adds healthy variance across generation loops
          response_format: { type: "json_object" } // Enforces strict JSON handling
        })
      });

      if (!groqResponse.ok) {
        const internalErr = await groqResponse.text();
        throw new Error(`Groq operational API connection failure: ${internalErr}`);
      }

      const groqData = await groqResponse.json();
      let rawTextContent = groqData.choices[0].message.content.trim();

      // Sanitation layer clearing accidental backtick blocks
      rawTextContent = rawTextContent.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

      return new Response(rawTextContent, {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
