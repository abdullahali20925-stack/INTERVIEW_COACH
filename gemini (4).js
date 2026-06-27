// 1. Put your API key inside the quotation marks below:
const GEMINI_API_KEY = "AQ.Ab8RN6KYeD7h7JASui0VVE_2ByhO2CdiGorPH0GG_jN9kjKF-A"; 

// 2. Core function to call the Google Gemini API safely with advanced system criteria
async function askGemini(role, difficulty, question, userAnswer) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `
    You are an expert AI Interview Coach evaluating candidates for a professional SaaS platform. 
    Your task is to analyze the user's answer critically, fairly, and professionally based on the specific role and difficulty level provided.
    
    Target Role: ${role}
    Target Difficulty: ${difficulty}
    
    Evaluate technical accuracy, communication style, structuring framework (like the STAR method for behavioral queries), and domain depth matching the difficulty tier.
    
    You MUST respond ONLY with a clean JSON object. Do not include any markdown formatting, backticks, or text outside the JSON block.
    
    The JSON structure must match this EXACTLY:
    {
        "score": 8,
        "strengths": "Provide 1-2 detailed bullet points highlighting exactly what technical or structural aspects they performed well.",
        "improvements": "Provide 1-2 detailed bullet points highlighting structural missing arguments, vague assertions, or key knowledge gaps.",
        "suggested": "Give a clear, tactical 1-2 sentence actionable advice block on how to perfectly re-engineer this specific response.",
        "example": "Write a high-end, top-tier model response (80-150 words) displaying how an exceptional candidate would address this prompt perfectly at a ${difficulty} level."
    }
    `;

    const userPrompt = `Interview Question Asked: "${question}"\nCandidate's Submitted Answer: "${userAnswer}"`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Error communicating with Gemini:", error);
        return null;
    }
}

// Asks Gemini to generate a realistic, context-aware, famous role-specific interview question
async function generateInterviewQuestion(role, difficulty) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `
    You are an elite corporate technical recruiter. Your goal is to generate ONE highly realistic, common, or famous interview question for the following role and difficulty level.
    The question should draw from actual historical interview loops at top global companies to genuinely prepare the candidate.
    
    Role: ${role}
    Difficulty Tier: ${difficulty}
    
    Respond ONLY with a clean JSON object. Do not include markdown formatting or backticks.
    
    The JSON structure must match this EXACTLY:
    {
        "category": "Behavioral, Technical, or Situational",
        "question": "The actual detailed text of the professional interview question goes here."
    }
    `;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });
        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Error generating question:", error);
        return { category: "General", question: "Tell me about a challenging project you managed from inception to deployment, and how you handled roadblock constraints." };
    }
}

// 3. Cleanly override Claude's interview engine functions and maintain UI synchronization
window.startInterview = async function() {
    // Read the choices made on screen safely
    const roleTitle = selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === selectedRole)?.title;
        
    const finalRole = roleTitle || "Software Engineer";
    const finalDiff = selectedDiff || "beginner";
        
    document.getElementById('headerRole').innerText = finalRole;
    document.getElementById('headerDiff').innerText = finalDiff.toUpperCase();
    
    // Switch view screens cleanly
    document.getElementById('landing').classList.remove('active');
    document.getElementById('interview').classList.add('active');
    
    // Show a clean loading layout while Gemini compiles the dataset
    document.getElementById('qText').innerText = "Querying live interview datasets to craft an elite custom prompt...";
    document.getElementById('qCategory').innerText = "Loading Framework...";
    
    // Clear out old states from previous tracking operations
    document.getElementById('answerBox').value = "";
    document.getElementById('wordCount').innerText = "0";
    document.getElementById('meterBar').style.width = "0%";
    document.getElementById('meterVal').innerText = "—";
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('feedbackPanel').classList.remove('visible');

    // Call Gemini to generate the custom question
    const dynamicQuestion = await generateInterviewQuestion(finalRole, finalDiff);
    
    // Inject the real question into the viewport layout
    document.getElementById('qText').innerText = dynamicQuestion.question;
    document.getElementById('qCategory').innerText = dynamicQuestion.category;
};

// Handle interactive input typing telemetry safely
window.onAnswerType = function() {
    const box = document.getElementById('answerBox');
    const text = box.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    
    document.getElementById('wordCount').innerText = words;
    document.getElementById('submitBtn').disabled = words < 5; // Unlocks button when input text exists
};

// Process analysis parameters when clicking "Get Feedback"
window.submitAnswer = async function() {
    const submitBtn = document.getElementById('submitBtn');
    const question = document.getElementById('qText').innerText;
    const answer = document.getElementById('answerBox').value.trim();
    
    const roleTitle = selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === selectedRole)?.title;
    const finalRole = roleTitle || "Software Engineer";
    const finalDiff = selectedDiff || "beginner";
    
    if (!answer) return;
    
    submitBtn.innerText = "Analyzing answer protocols...";
    submitBtn.disabled = true;
    
    // Execute call to core evaluator engine
    const feedback = await askGemini(finalRole, finalDiff, question, answer);
    
    if (feedback) {
        const score = Number(feedback.score) || 0;
        const scoreBox = document.getElementById('fbScore');
        scoreBox.innerText = `${score}/10`;
        
        // Color-code scores dynamically
        scoreBox.className = "fb-score";
        if (score >= 8) scoreBox.classList.add('hi');
        else if (score >= 5) scoreBox.classList.add('mid');
        else scoreBox.classList.add('lo');
        
        // Inject feedback data straight into HTML layout targets
        document.getElementById('fbStrengths').innerText = feedback.strengths;
        document.getElementById('fbWeaknesses').innerText = feedback.improvements;
        document.getElementById('fbSuggestion').innerText = feedback.suggested;
        document.getElementById('fbExample').innerText = feedback.example;
        
        // Show panel dashboard viewport cleanly
        document.getElementById('feedbackPanel').classList.add('visible');
        
        // Render accuracy gauge meters smoothly
        document.getElementById('meterBar').style.width = `${score * 10}%`;
        document.getElementById('meterVal').innerText = `${score * 10}%`;

        // NEW: Automatically write metrics logs straight into the Firebase cloud database if authenticated
        if (window.saveSessionToCloud) {
            window.saveSessionToCloud(finalRole, score, feedback);
        }
    } else {
        alert("Unable to compile feedback metrics. Verify API key string or system online connection thresholds.");
    }
    
    submitBtn.innerText = "Get feedback";
    submitBtn.disabled = false;
};

// Next Question loops retrigger context generations natively
window.nextQuestion = function() {
    window.startInterview();
};

window.skipQuestion = function() {
    window.startInterview();
};