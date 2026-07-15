let generatedQuestionsList = [];
let currentQuestionIndex = 0;
let userAnswersData = [];

function getApiKey() {
    return "PROXY_MANAGED"; 
}

async function generateQuestions(role, difficulty) {
    const apiKey = getApiKey();
    if (!apiKey) {
        alert("API Key is missing!");
        return null;
    }

    const url = `https://gemini-proxy.abdullahali20925.workers.dev/v1beta/models/gemini-2.5-flash:generateContent`;

    const prompt = `You are an elite, world-class executive recruiter and technical interviewer. Your goal is to generate 5 distinct, highly realistic, and field-appropriate interview questions for the role of "${role}" at a "${difficulty}" level. Return ONLY a valid JSON array of exactly 5 objects matching this template: [{"q": "Question Text", "cat": "Technical"}]`;

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

async function askGemini(question, userAnswer) {
    const apiKey = getApiKey();
    if (!apiKey) {
        alert("API Key is missing!");
        return null;
    }

    const url = `https://gemini-proxy.abdullahali20925.workers.dev/v1beta/models/gemini-2.5-flash:generateContent`;

    const systemPrompt = `You are an expert Interview Coach. Analyze the user's answer. Respond ONLY with a clean JSON object matching this template: {"score": 8, "strengths": "text", "improvements": "text", "suggested": "text", "example": "text"}`;
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
        generatedQuestionsList = questions;
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

function loadQuestion(index) {
    const qData = generatedQuestionsList[index];
    
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

window.onAnswerType = function() {
    const box = document.getElementById('answerBox');
    const text = box.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    
    document.getElementById('wordCount').innerText = words;
    document.getElementById('submitBtn').disabled = words < 5; 
};

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
            category: generatedQuestionsList[currentQuestionIndex].cat,
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
        question: generatedQuestionsList[currentQuestionIndex].q,
        category: generatedQuestionsList[currentQuestionIndex].cat,
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

function showFinalResults() {
    document.getElementById('interview').classList.remove('active');
    document.getElementById('results').classList.add('active');

    const totalScore = userAnswersData.reduce((acc, item) => acc + item.score, 0);
    const averageScore = Math.round((totalScore / 5) * 10) / 10;
    
    let grade = 'D';
    let verdict = "Needs Practice";
    let subtitle = "Don't discourage yourself.";
    
    if (averageScore >= 8.5) {
        grade = 'A'; verdict = "Interview Ready!"; subtitle = "Excellent work!";
    } else if (averageScore >= 7.0) {
        grade = 'B'; verdict = "Strong Performance"; subtitle = "Good domain knowledge.";
    } else if (averageScore >= 5.0) {
        grade = 'C'; verdict = "Getting There"; subtitle = "Focus on formatting with the STAR method.";
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
            recommendationsList.push(`Focus on the <strong>${item.category}</strong>: ${item.feedback.suggested || "Improve structure."}`);
        }
    });

    document.getElementById('scoreRows').innerHTML = scoreRowsHTML;
    document.getElementById('strongSkills').innerHTML = strongSkillsList.length ? strongSkillsList.map(s => `<div class="results-skill">${s}</div>`).join('') : "None";
    document.getElementById('weakSkills').innerHTML = weakSkillsList.length ? weakSkillsList.map(s => `<div class="results-skill">${s}</div>`).join('') : "None";
    document.getElementById('recsList').innerHTML = recommendationsList.length ? recommendationsList.map((rec, idx) => `<div class="rec-item"><span>0${idx+1}</span><div>${rec}</div></div>`).join('') : "None";
}

window.retryInterview = function() {
    document.getElementById('results').classList.remove('active');
    window.startInterview();
};
