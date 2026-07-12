// 1. Put your API key inside the quotation marks below:
const GEMINI_API_KEY = "AQ.Ab8RN6LS8nTSJLHqSWCITBD05FKvQq8cIdeTYR19kjrfqw891A"; 

// 2. Core function to call the Google Gemini API safely
async function askGemini(question, userAnswer) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const systemPrompt = `
    You are an expert Interview Coach. Analyze the user's answer to the interview question provided.
    You MUST respond ONLY with a clean JSON object. Do not include any markdown formatting, backticks, or text outside the JSON block.
    
    The JSON structure must match this EXACTLY:
    {
        "score": 8,
        "strengths": "Provide 1-2 detailed bullet points highlighting what they did well.",
        "improvements": "Provide 1-2 details on what key information or structure was missing.",
        "suggested": "Give a quick, actionable tip on how to restructure or improve this specific answer.",
        "example": "Write a strong, professional example answer based on the user's situation."
    }
    `;

    const userPrompt = `Interview Question: "${question}"\nUser's Answer: "${userAnswer}"`;

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

// 3. Gracefully override Claude's interview engine functions
window.startInterview = function() {
    // Read the choices made on screen
    const roleTitle = selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === selectedRole)?.title;
        
    document.getElementById('headerRole').innerText = roleTitle || "Interviewee";
    document.getElementById('headerDiff').innerText = selectedDiff.toUpperCase();
    
    // Switch screens cleanly
    document.getElementById('landing').classList.remove('active');
    document.getElementById('interview').classList.add('active');
    
    // Set a default mock question to get started
    document.getElementById('qText').innerText = "Tell me about yourself and why you are looking to secure a position in this industry domain environment.";
    document.getElementById('qCategory').innerText = "Introduction";
    
    // Clear old data out of the answers and score bars
    document.getElementById('answerBox').value = "";
    document.getElementById('wordCount').innerText = "0";
    document.getElementById('meterBar').style.width = "0%";
    document.getElementById('meterVal').innerText = "—";
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('feedbackPanel').classList.remove('visible');
};

// Handle typing word counts safely
window.onAnswerType = function() {
    const box = document.getElementById('answerBox');
    const text = box.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    
    document.getElementById('wordCount').innerText = words;
    document.getElementById('submitBtn').disabled = words < 5; // Enable button if they typed an answer
};

// Process feedback when clicking "Get Feedback"
window.submitAnswer = async function() {
    const submitBtn = document.getElementById('submitBtn');
    const question = document.getElementById('qText').innerText;
    const answer = document.getElementById('answerBox').value.trim();
    
    if (!answer) return;
    
    submitBtn.innerText = "Analyzing answer...";
    submitBtn.disabled = true;
    
    const feedback = await askGemini(question, answer);
    
    if (feedback) {
        // Apply scores
        const score = feedback.score || 0;
        const scoreBox = document.getElementById('fbScore');
        scoreBox.innerText = `${score}/10`;
        
        // Color code scores dynamically
        scoreBox.className = "fb-score";
        if (score >= 8) scoreBox.classList.add('hi');
        else if (score >= 5) scoreBox.classList.add('mid');
        else scoreBox.classList.add('lo');
        
        // Inject feedback data straight into HTML visual placeholders
        document.getElementById('fbStrengths').innerText = feedback.strengths;
        document.getElementById('fbWeaknesses').innerText = feedback.improvements;
        document.getElementById('fbSuggestion').innerText = feedback.suggested;
        document.getElementById('fbExample').innerText = feedback.example;
        
        // Show the panel smoothly
        document.getElementById('feedbackPanel').classList.add('visible');
        
        // Fill out UI Strength meter bars
        document.getElementById('meterBar').style.width = `${score * 10}%`;
        document.getElementById('meterVal').innerText = `${score * 10}%`;
    } else {
        alert("Unable to process feedback. Check your API key or connection.");
    }
    
    submitBtn.innerText = "Get feedback";
    submitBtn.disabled = false;
};

// Finish up or go to next question placeholders
window.nextQuestion = function() {
    alert("Fantastic job! You've successfully wired up Gemini to grade your responses. You can keep editing index.html to add more questions!");
    goHome();
};

window.skipQuestion = function() {
    goHome();
};
