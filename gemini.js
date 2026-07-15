// Active state of the ongoing session
let generatedQuestionsList = []; // Changed name slightly to prevent function conflict
let currentQuestionIndex = 0;
let userAnswersData = []; // Stores questions, user answers, and scores

// Helper function modified to bypass frontend key requirements since your Cloudflare worker proxies it
function getApiKey() {
    return "PROXY_MANAGED"; 
}

// 2. Generate customized questions from the Gemini API via Cloudflare Worker Proxy
async function generateQuestions(role, difficulty) {
    const apiKey = getApiKey();
    if (!apiKey) {
        alert("API Key is missing!");
        return null;
    }

    // Directing request to your private proxy server
    const url = `https://gemini-proxy.abdullahali20925.workers.dev/v1beta/models/gemini-2.5-flash:generateContent`;

    const prompt = `
    You are an elite, world-class executive recruiter and technical interviewer.
    Your goal is to generate 5 distinct, highly realistic, and field-appropriate interview questions for the role of "${role}" at a "${difficulty}" level.
    
    Draw inspiration from trusted, high-standard sources such as:
    - Frequently asked industry-standard interview questions.
    - Top tech/business interview preparation pipelines (e.g., LeetCode, STAR method behavioral frameworks, Glassdoor patterns, McKinsey cases).
    - Authentic behavioral and situational situations that professionals actually encounter.

    The questions must follow a progressive 5-stage framework:
    1. Introduction / Icebreaker (Assess communication style, confidence, and passion)
    2. Technical / Domain Knowledge (Assess core industry skills, frameworks, or principles)
    3. Behavioral (Assess collaboration, conflict resolution, or dealing with ambiguity using STAR logic)
    4. Situational / Scenario-based (Hypothetical curveball situations specific to this level and field)
    5. Critical Thinking / Problem Solving (A highly realistic challenge testing strategic depth)

    Return ONLY a valid JSON array of exactly 5 objects. Do not wrap in markdown blocks, do not write backticks, and do not output extra prose.
    
    The JSON array must EXACTLY match this structural template:
    [
        {"q": "First Question Text", "cat": "Introduction"},
        {"q": "Second Question Text", "cat": "Technical"},
        {"q": "Third Question Text", "cat": "Behavioral"},
        {"q": "Fourth Question Text", "cat": "Situational"},
        {"q": "Fifth Question Text", "cat": "Problem Solving"}
    ]
    `;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "x-api-key": apiKey
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Error generating questions:", error);
        return null;
    }
}

// 3. Core function to analyze user answers via Cloudflare Worker Proxy
async function askGemini(question, userAnswer) {
    const apiKey = getApiKey();
    if (!apiKey) {
        alert("API Key is missing!");
        return null;
    }

    // Directing request to your private proxy server
    const url = `https://gemini-proxy.abdullahali20925.workers.dev/v1beta/models/gemini-2.5-flash:generateContent`;

    const systemPrompt = `
    You are an expert Interview Coach. Analyze the user's answer to the interview question provided.
    Provide constructive, authentic, and direct mentoring.
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
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "x-api-key": apiKey
            },
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

// 4. Clean start handler with dynamic API calling
window.startInterview = async function() {
    const startBtn = document.getElementById('startBtn');
    
    const roleTitle = selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === selectedRole)?.title;
        
    if (!roleTitle) return;

    startBtn.innerText = "Generating questions...";
    startBtn.disabled = true;

    const questions = await generateQuestions(roleTitle, selectedDiff);
    
    if (questions && questions.length === 5) {
        generatedQuestionsList = questions; // Updated array reference
        currentQuestionIndex = 0;
        userAnswersData = [];
        
        document.getElementById('headerRole').innerText = roleTitle;
        document.getElementById('headerDiff').innerText = selectedDiff.toUpperCase();
        
        document.getElementById('landing').classList.remove('active');
        document.getElementById('interview').classList.add('active');
        
        loadQuestion(0);
    } else {
        alert("Oops! Could not generate questions. Please check your network connection.");
    }
    
    startBtn.innerText = "Begin interview →";
    startBtn.disabled = false;
};

// Helper function to render active question
function loadQuestion(index) {
    const qData = generatedQuestionsList[index]; // Updated array reference
    
    document.getElementById('progressFill').style.width = `${(index / 5) * 100}%`;
    document.getElementById('progressText').innerText = `Question ${index + 1} of 5`;
    document.getElementById('qNum').innerText = `Q${index + 1}`;
    document.getElementById('qCategory').innerText = qData.cat;
    document.getElementById('qText').innerText = qData.q;
    
    document.getElementById('answerBox').value = "";
    document.getElementById('answerBox').disabled = false;
    document.getElementById('wordCount').innerText = "0";
    document.getElementById('meterBar').style.width = "0%";
    document.getElementById('meterVal').innerText = "—";
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('feedbackPanel').classList.remove('visible');
    
    document.getElementById('submitBtn').style.display = "block";
    document.getElementById('nextQBtn').innerText = index === 4 ? "Finish & View Results →" : "Next question →";
}

// Handle typing word counts safely
window.onAnswerType = function() {
    const box = document.getElementById('answerBox');
    const text = box.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    
    document.getElementById('wordCount').innerText = words;
    document.getElementById('submitBtn').disabled = words < 5; 
};

// Process feedback when clicking "Get Feedback"
window.submitAnswer = async function() {
    const submitBtn = document.getElementById('submitBtn');
    const question = document.getElementById('qText').innerText;
    const answer = document.getElementById('answerBox').value.trim();
    
    if (!answer) return;
    
    submitBtn.innerText = "Analyzing answer...";
    submitBtn.disabled = true;
    document.getElementById('answerBox').disabled = true;
    
    const feedback = await askGemini(question, answer);
    
    if (feedback) {
        const score = feedback.score || 0;
        
        userAnswersData.push({
            question: question,
            category: generatedQuestionsList[currentQuestionIndex].cat, // Updated array reference
            answer: answer,
            score: score,
            feedback: feedback
        });

        const scoreBox = document.getElementById('fbScore');
        scoreBox.innerText = `${score}/10`;
        
        scoreBox.className = "fb-score";
        if (score >= 8) scoreBox.classList.add('hi');
        else if (score >= 5) scoreBox.classList.add('mid');
        else scoreBox.classList.add('lo');
        
        document.getElementById('fbStrengths').innerText = feedback.strengths;
        document.getElementById('fbWeaknesses').innerText = feedback.improvements;
        document.getElementById('fbSuggestion').innerText = feedback.suggested;
        document.getElementById('fbExample').innerText = feedback.example;
        
        document.getElementById('feedbackPanel').classList.add('visible');
        
        document.getElementById('meterBar').style.width = `${score * 10}%`;
        document.getElementById('meterVal').innerText = `${score * 10}%`;
        
        submitBtn.style.display = "none";
    } else {
        alert("Unable to process feedback. Check your proxy server connection.");
        document.getElementById('answerBox').disabled = false;
    }
    
    submitBtn.innerText = "Get feedback";
    submitBtn.disabled = false;
};

// Next Question flow controller
window.nextQuestion = function() {
    if (currentQuestionIndex < 4) {
        currentQuestionIndex++;
        loadQuestion(currentQuestionIndex);
    } else {
        showFinalResults();
    }
};

window.skipQuestion = function() {
    userAnswersData.push({
        question: generatedQuestionsList[currentQuestionIndex].q, // Updated array reference
        category: generatedQuestionsList[currentQuestionIndex].cat, // Updated array reference
        answer: "[Skipped]",
        score: 0,
        feedback: { strengths: "N/A", improvements: "Skipped", suggested: "N/A", example: "N/A" }
    });

    if (currentQuestionIndex < 4) {
        currentQuestionIndex++;
        loadQuestion(currentQuestionIndex);
    } else {
        showFinalResults();
    }
};

// Calculate and generate final screen results dynamically
function showFinalResults() {
    document.getElementById('interview').classList.remove('active');
    document.getElementById('results').classList.add('active');

    const totalScore = userAnswersData.reduce((acc, item) => acc + item.score, 0);
    const averageScore = Math.round((totalScore / 5) * 10) / 10;
    
    let grade = 'D';
    let verdict = "Needs Practice";
    let subtitle = "Don't discourage yourself. Prepare some structures and jump back in!";
    
    if (averageScore >= 8.5) {
        grade = 'A';
        verdict = "Interview Ready!";
        subtitle = "Excellent work! Your answers are structured and showcase strong industry competencies.";
    } else if (averageScore >= 7.0) {
        grade = 'B';
        verdict = "Strong Performance";
        subtitle = "Good domain knowledge, with just minor room left for structure and specificity improvement.";
    } else if (averageScore >= 5.0) {
        grade = 'C';
        verdict = "Getting There";
        subtitle = "Focus on formatting with the STAR method and presenting clearer quantitative results.";
    }

    const roleTitle = selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === selectedRole)?.title;

    document.getElementById('resultsRole').innerText = `${roleTitle.toUpperCase()} — ${selectedDiff.toUpperCase()}`;
    
    const gradeBox = document.getElementById('resultsGrade');
    gradeBox.innerText = grade;
    gradeBox.className = `results-grade ${grade}`;
    
    document.getElementById('resultsVerdict').innerText = verdict;
    document.getElementById('resultsSubtitle').innerText = subtitle;

    let scoreRowsHTML = "";
    let strongSkillsList = [];
    let weakSkillsList = [];
    let recommendationsList = [];

    userAnswersData.forEach((item, index) => {
        scoreRowsHTML += `
        <div class="srow">
            <div class="srow-lbl">${item.category}</div>
            <div class="srow-bar">
                <div class="srow-fill" style="width: ${item.score * 10}%; background: ${item.score >= 8 ? 'var(--green)' : item.score >= 5 ? 'var(--amber)' : 'var(--red)'}"></div>
            </div>
            <div class="srow-val">${item.score}/10</div>
        </div>`;

        if (item.score >= 7) {
            strongSkillsList.push(item.category);
        } else {
            weakSkillsList.push(item.category);
            recommendationsList.push(`Focus on the <strong>${item.category}</strong>: ${item.feedback.suggested || "Make sure to clearly outline your active steps."}`);
        }
    });

    document.getElementById('scoreRows').innerHTML = scoreRowsHTML;
    
    document.getElementById('strongSkills').innerHTML = strongSkillsList.length 
        ? strongSkillsList.map(s => `<div class="results-skill">${s}</div>`).join('') 
        : "<div class='results-skill'>Keep practicing to show structural strength!</div>";
        
    document.getElementById('weakSkills').innerHTML = weakSkillsList.length 
        ? weakSkillsList.map(s => `<div class="results-skill">${s}</div>`).join('') 
        : "<div class='results-skill'>None! You performed solid across all sections.</div>";

    document.getElementById('recsList').innerHTML = recommendationsList.length 
        ? recommendationsList.map((rec, idx) => `<div class="rec-item"><span class="rec-num">0${idx+1}</span><div>${rec}</div></div>`).join('') 
        : "<div class='rec-item'>Fantastic work! Keep reviewing real-world case studies to maintain your edge.</div>";
}

// Reset functions
window.retryInterview = function() {
    document.getElementById('results').classList.remove('active');
    window.startInterview();
};
