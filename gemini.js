// 1. Put your API key inside the quotation marks below:
const GEMINI_API_KEY = "AQ.Ab8RN6KYeD7h7JASui0VVE_2ByhO2CdiGorPH0GG_jN9kjKF-A"; 

// Interview State Tracking
let currentQuestionIndex = 0;
let totalQuestions = 5;
let activeQuestions = [];
let interviewScores = [];

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
        
        // Strip out any accidental markdown wrapper backticks to prevent JSON parsing crashes
        const cleanText = rawText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Error communicating with Gemini:", error);
        return null;
    }
}

// Helper to generate generic fallback questions if a role doesn't have explicit entries in QB
function getFallbackQuestions(roleTitle, difficulty) {
    return [
        { q: `Tell me about yourself and why you are interested in a ${roleTitle} position.`, cat: 'Introduction', diff: difficulty },
        { q: `Describe a challenging project you handled as a ${roleTitle} and how you overcame obstacles.`, cat: 'Behavioral', diff: difficulty },
        { q: `How do you prioritize your workload when juggling multiple tight deadlines?`, cat: 'Problem Solving', diff: difficulty },
        { q: `What is a common misconception people have about the role of a ${roleTitle}, and how do you handle it?`, cat: 'Technical', diff: difficulty },
        { q: `Where do you see yourself professionally in the next three years within this domain?`, cat: 'Communication', diff: difficulty }
    ];
}

// 3. Start the interview loop setup
window.startInterview = function() {
    const roleTitle = selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === selectedRole)?.title;
        
    document.getElementById('headerRole').innerText = roleTitle || "Interviewee";
    document.getElementById('headerDiff').innerText = selectedDiff.toUpperCase();
    
    // Select questions from database or generate standard fallbacks
    let pool = QB[selectedRole] || [];
    // Filter by difficulty level
    let filtered = pool.filter(q => q.diff === selectedDiff);
    
    // Fallback if not enough questions match criteria
    if (filtered.length < totalQuestions) {
        filtered = filtered.concat(getFallbackQuestions(roleTitle || "this role", selectedDiff));
    }
    
    // Shuffle and pick exactly 5 questions
    activeQuestions = filtered.sort(() => 0.5 - Math.random()).slice(0, totalQuestions);
    
    // Reset indices and state arrays
    currentQuestionIndex = 0;
    interviewScores = [];
    
    // Load first question UI elements
    loadQuestion();
    
    // Switch screens cleanly
    document.getElementById('landing').classList.remove('active');
    document.getElementById('interview').classList.add('active');
};

function loadQuestion() {
    const currentQ = activeQuestions[currentQuestionIndex];
    
    document.getElementById('qNum').innerText = `Q${currentQuestionIndex + 1}`;
    document.getElementById('progressText').innerText = `Question ${currentQuestionIndex + 1} of ${totalQuestions}`;
    document.getElementById('progressFill').style.width = `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`;
    
    document.getElementById('qText').innerText = currentQ.q;
    document.getElementById('qCategory').innerText = currentQ.cat;
    
    // Reset text entry blocks
    document.getElementById('answerBox').value = "";
    document.getElementById('answerBox').disabled = false;
    document.getElementById('wordCount').innerText = "0";
    document.getElementById('meterBar').style.width = "0%";
    document.getElementById('meterVal').innerText = "—";
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('feedbackPanel').classList.remove('visible');
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
        interviewScores.push(score);
        
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
        
        // Update next button display dynamically based on interview progress
        const nextBtn = document.getElementById('nextQBtn');
        if (currentQuestionIndex === totalQuestions - 1) {
            nextBtn.innerText = "Finish & View Results →";
        } else {
            nextBtn.innerText = "Next question →";
        }
    } else {
        alert("Unable to process feedback. Check your API key or connection.");
        submitBtn.innerText = "Get feedback";
        submitBtn.disabled = false;
        document.getElementById('answerBox').disabled = false;
    }
};

window.nextQuestion = function() {
    if (currentQuestionIndex < totalQuestions - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        showResultsSummary();
    }
};

window.skipQuestion = function() {
    interviewScores.push(0); // Add placeholder zero score for skipped tracking
    if (currentQuestionIndex < totalQuestions - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        showResultsSummary();
    }
};

// 4. Populate and transition to results evaluation screen
function showResultsSummary() {
    document.getElementById('interview').classList.remove('active');
    document.getElementById('results').classList.add('active');
    
    const roleTitle = document.getElementById('headerRole').innerText;
    document.getElementById('resultsRole').innerText = roleTitle.toUpperCase();
    
    // Calculate Average Scores
    const sum = interviewScores.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / totalQuestions) * 10) / 10;
    
    let grade = 'D';
    let verdict = 'Needs Preparation';
    let subtitle = 'Keep practicing to build structure and confidence.';
    
    if (avg >= 8.5) { grade = 'A'; verdict = 'Job Ready!'; subtitle = 'Excellent depth, concrete examples, and clear delivery structures.'; }
    else if (avg >= 7.0) { grade = 'B'; verdict = 'Strong Competitor'; subtitle = 'Good baseline understanding. Polish specific missing metrics.'; }
    else if (avg >= 5.0) { grade = 'C'; verdict = 'Developing Skills'; subtitle = 'Focus on expanding your answers using structural methods like STAR.'; }
    
    const gradeBox = document.getElementById('resultsGrade');
    gradeBox.innerText = grade;
    gradeBox.className = `results-grade ${grade}`;
    
    document.getElementById('resultsVerdict').innerText = verdict;
    document.getElementById('resultsSubtitle').innerText = subtitle;
    
    // Render static placeholder skills and performance break-downs for simplicity
    document.getElementById('strongSkills').innerHTML = `<div class="results-skill">Clear communication flow</div><div class="results-skill">Core domain knowledge</div>`;
    document.getElementById('weakSkills').innerHTML = `<div class="results-skill">Quantifiable metrics metrics</div><div class="results-skill">STAR framing structure</div>`;
    
    let rowsHtml = '';
    activeQuestions.forEach((q, idx) => {
        const s = interviewScores[idx] || 0;
        rowsHtml += `
        <div class="srow">
            <span class="srow-lbl">Q${idx + 1}: ${q.cat}</span>
            <div class="srow-bar"><div class="srow-fill" style="width: ${s * 10}%; background: ${s >= 8 ? '#27AE60' : s >= 5 ? '#F2994A' : '#EB5757'}"></div></div>
            <span class="srow-val">${s}/10</span>
        </div>`;
    });
    document.getElementById('scoreRows').innerHTML = rowsHtml;
    
    document.getElementById('recsList').innerHTML = `
        <div class="rec-item"><span class="rec-num">01</span> Leverage data points and specific results in your behavioral summaries.</div>
        <div class="rec-item"><span class="rec-num">02</span> Practice formatting responses strictly via Situation, Task, Action, Result framework.</div>
    `;
}

window.retryInterview = function() {
    document.getElementById('results').classList.remove('active');
    window.startInterview();
};

window.copyResults = function() {
    const role = document.getElementById('resultsRole').innerText;
    const grade = document.getElementById('resultsGrade').innerText;
    const verdict = document.getElementById('resultsVerdict').innerText;
    textToCopy = `AI Interview Coach Results Summary\nRole Focus: ${role}\nOverall Grade Evaluation: ${grade} (${verdict})\nPracticed via InterviewCoach.ai`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Performance results summary copied to clipboard successfully!");
    });
};
