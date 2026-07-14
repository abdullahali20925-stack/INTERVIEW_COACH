
// 1. Paste your API key here (ensure no spaces around it)
const GEMINI_API_KEY = "AQ.Ab8RN6Iste2B6iVUmF3mTLmWVLFEgUN5vGXdU1jkwJyerzyDug"; 

// Global state tracking
let currentInterviewQuestions = [];
let currentQuestionIndex = 0;
let interviewScores = [];

// Helper to clean markdown fences safely if the API returns them in a raw text block
function cleanJsonString(str) {
    let clean = str.trim();
    if (clean.startsWith("```json")) {
        clean = clean.substring(7);
    } else if (clean.startsWith("```")) {
        clean = clean.substring(3);
    }
    if (clean.endsWith("```")) {
        clean = clean.substring(0, clean.length - 3);
    }
    return clean.trim();
}

// Helper to compile metadata context
function getExtraContext() {
    const company = document.getElementById('companyInput')?.value.trim() || "Unspecified Target Company";
    const industry = document.getElementById('industryInput')?.value.trim() || "General Industry Sector";
    const description = document.getElementById('jobDescInput')?.value.trim() || "Standard operational responsibilities";
    return { company, industry, description };
}

// Generates custom questions tailored deeply by profession and baseline difficulty
async function generateInterviewQuestions(jobTitle, experienceLevel) {
    // FIXED: Fixed the syntax error in the template literal and updated model to gemini-2.5-flash
    const url = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$){GEMINI_API_KEY}`;
    const context = getExtraContext();

    const systemPrompt = `You are an elite Senior HR Recruiter. Your task is to design a realistic, fully customized interview plan tailored to the provided job title and experience level.
You MUST respond with a JSON object matching this exact schema:
{
  "job": "string",
  "questions": [
    {
      "id": 1,
      "category": "string",
      "difficulty": "string",
      "question": "string"
    }
  ]
}
Generate exactly 5 unique questions.`;

    const userPrompt = `Generate a set of sequential questions for: "${jobTitle}".
Experience level: "${experienceLevel}".
Target Company: "${context.company}"
Industry Context: "${context.industry}"
Job Description: "${context.description}"`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error("Google API Server Error Response:", errData);
            throw new Error(`HTTP Status ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("Empty response returned.");
        
        const rawText = cleanJsonString(data.candidates[0].content.parts[0].text);
        const parsed = JSON.parse(rawText);

        if (parsed && Array.isArray(parsed.questions)) {
            return parsed.questions.map((q, index) => ({
                id: index + 1,
                category: q.category || "General Domain",
                difficulty: q.difficulty || "Standard",
                question: q.question
            }));
        }
    } catch (e) {
        console.error("Critical failure inside generateInterviewQuestions pipeline:", e);
    }
    return null;
}

// Evaluate user answers in real-time
async function askGemini(question, userAnswer) {
    // FIXED: Fixed the syntax error in the template literal and updated model to gemini-2.5-flash
    const url = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$){GEMINI_API_KEY}`;
    const context = getExtraContext();

    const systemPrompt = `You are an AI Interview Evaluation Coach. Analyze the user's answer to the question.
You MUST respond with a JSON object matching this schema:
{
  "score": 8, // Integer out of 10
  "strengths": "string",
  "improvements": "string",
  "suggested": "string",
  "example": "string",
  "careerAdvice": "string"
}`;

    const userPrompt = `Question: "${question}"
User Answer: "${userAnswer}"
Target Company: "${context.company}"
Industry: "${context.industry}"`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) throw new Error(`HTTP Status ${response.status}`);

        const data = await response.json();
        const rawText = cleanJsonString(data.candidates[0].content.parts[0].text);
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Critical failure inside askGemini pipeline:", error);
    }
    return null;
}

// UI Functions
function renderCurrentQuestion() {
    if (currentQuestionIndex >= currentInterviewQuestions.length) {
        finishAndShowResults();
        return;
    }

    const currentQ = currentInterviewQuestions[currentQuestionIndex];
    
    document.getElementById('qNum').innerText = `Q${currentQ.id}`;
    document.getElementById('qCategory').innerText = `${currentQ.category} · ${currentQ.difficulty}`;
    document.getElementById('qText').innerText = currentQ.question;
    
    const totalCount = currentInterviewQuestions.length;
    const progressPercent = (currentQuestionIndex / totalCount) * 100;
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
    document.getElementById('progressText').innerText = `Question ${currentQuestionIndex + 1} of ${totalCount}`;

    document.getElementById('answerBox').value = "";
    document.getElementById('answerBox').disabled = false;
    document.getElementById('wordCount').innerText = "0";
    document.getElementById('meterBar').style.width = "0%";
    document.getElementById('meterVal').innerText = "—";
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('feedbackPanel').classList.remove('visible');
    
    const actionRow = document.querySelector('.action-row');
    if (actionRow) actionRow.style.display = 'flex';
}

window.startInterview = async function() {
    const startBtn = document.getElementById('startBtn');
    const originalBtnText = startBtn.innerHTML;
    
    const roleTitle = window.selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === window.selectedRole)?.title;
        
    startBtn.innerHTML = `<span class="spinner"></span> Building customized interview...`;
    startBtn.disabled = true;

    const generated = await generateInterviewQuestions(roleTitle, window.selectedDiff);

    if (!generated || generated.length === 0) {
        alert("Friendly notice: We encountered an issue setting up the interview. Open your console (F12) to inspect the error log.");
        startBtn.innerHTML = originalBtnText;
        startBtn.disabled = false;
        return;
    }

    currentInterviewQuestions = generated;
    currentQuestionIndex = 0;
    interviewScores = [];

    document.getElementById('headerRole').innerText = roleTitle || "Interviewee";
    document.getElementById('headerDiff').innerText = window.selectedDiff.toUpperCase();
    
    document.getElementById('landing').classList.remove('active');
    document.getElementById('interview').classList.add('active');
    
    startBtn.innerHTML = originalBtnText;
    startBtn.disabled = false;

    renderCurrentQuestion();
};

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
        const scoreBox = document.getElementById('fbScore');
        scoreBox.innerText = `${score}/10`;
        
        scoreBox.className = "fb-score";
        if (score >= 8) scoreBox.classList.add('hi');
        else if (score >= 5) scoreBox.classList.add('mid');
        else scoreBox.classList.add('lo');
        
        document.getElementById('fbStrengths').innerText = feedback.strengths;
        document.getElementById('fbWeaknesses').innerText = feedback.improvements;
        document.getElementById('fbSuggestion').innerText = feedback.suggested;
        
        const displayAdvice = feedback.careerAdvice ? `\n\nCareer Progression Tip: ${feedback.careerAdvice}` : "";
        document.getElementById('fbExample').innerText = `${feedback.example}${displayAdvice}`;
        
        document.getElementById('feedbackPanel').classList.add('visible');
        
        document.getElementById('meterBar').style.width = `${score * 10}%`;
        document.getElementById('meterVal').innerText = `${score * 10}%`;

        interviewScores.push({
            question: question,
            category: currentInterviewQuestions[currentQuestionIndex].category,
            score: score
        });

        const actionRow = document.querySelector('.action-row');
        if (actionRow) actionRow.style.display = 'none';
    } else {
        alert("Unable to process feedback. Check your API key or network connection.");
        document.getElementById('answerBox').disabled = false;
    }
    
    submitBtn.innerText = "Get feedback";
    submitBtn.disabled = false;
};

window.nextQuestion = function() {
    currentQuestionIndex++;
    renderCurrentQuestion();
};

window.skipQuestion = function() {
    interviewScores.push({
        question: document.getElementById('qText').innerText,
        category: currentInterviewQuestions[currentQuestionIndex].category,
        score: 0
    });
    currentQuestionIndex++;
    renderCurrentQuestion();
};

function finishAndShowResults() {
    document.getElementById('interview').classList.remove('active');
    document.getElementById('results').classList.add('active');

    const roleTitle = window.selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === window.selectedRole)?.title;

    document.getElementById('resultsRole').innerText = (roleTitle || "Profession").toUpperCase();

    let totalScore = 0;
    interviewScores.forEach(s => totalScore += s.score);
    const avgScore = interviewScores.length > 0 ? (totalScore / interviewScores.length) : 0;

    let grade = 'D';
    let verdict = 'Needs Development';
    let subtitle = 'Keep practicing to build your core domain responses.';

    if (avgScore >= 8.5) {
        grade = 'A'; verdict = 'Exceptional Performance!'; subtitle = 'You demonstrated expert role mastery. Ready to apply!';
    } else if (avgScore >= 7.0) {
        grade = 'B'; verdict = 'Strong Candidate'; subtitle = 'Solid command over the profession requirements.';
    } else if (avgScore >= 5.0) {
        grade = 'C'; verdict = 'Competent Baseline'; subtitle = 'Meets core expectations but can benefit from richer detail.';
    }

    const gradeBox = document.getElementById('resultsGrade');
    gradeBox.innerText = grade;
    gradeBox.className = `results-grade ${grade}`;
    document.getElementById('resultsVerdict').innerText = verdict;
    document.getElementById('resultsSubtitle').innerText = subtitle;

    const categoriesMap = {};
    interviewScores.forEach(s => {
        if (!categoriesMap[s.category]) {
            categoriesMap[s.category] = { total: 0, count: 0 };
        }
        categoriesMap[s.category].total += s.score;
        categoriesMap[s.category].count += 1;
    });

    let scoreRowsHtml = '';
    let strongSkillsHtml = '';
    let weakSkillsHtml = '';
    let recsHtml = '';
    let recCounter = 1;

    Object.keys(categoriesMap).forEach(cat => {
        const catAvg = categoriesMap[cat].total / categoriesMap[cat].count;
        const pct = catAvg * 10;
        
        scoreRowsHtml += `
        <div class="srow">
          <div class="srow-lbl">${cat}</div>
          <div class="srow-bar"><div class="srow-fill" style="width: ${pct}%"></div></div>
          <div class="srow-val">${pct.toFixed(0)}%</div>
        </div>`;

        if (catAvg >= 7.5) {
            strongSkillsHtml += `<div class="results-skill">${cat} Proficiency</div>`;
        } else {
            weakSkillsHtml += `<div class="results-skill">${cat} Depth</div>`;
            recsHtml += `
            <div class="rec-item">
              <div class="rec-num">0${recCounter++}</div>
              <div><strong>Expand on ${cat}:</strong> Focus on adding technical keywords, structural frameworks, and metrics to your answers.</div>
            </div>`;
        }
    });

    if (!strongSkillsHtml) strongSkillsHtml = '<div class="results-skill">General Baseline Answers</div>';
    if (!weakSkillsHtml) weakSkillsHtml = '<div class="results-skill">None identified. Consistent responses!</div>';
    if (!recsHtml) recsHtml = '<div class="rec-item"><div class="rec-num">✓</div><div>Fantastic session. Review alternate difficulty levels for more challenging tracks.</div></div>';

    document.getElementById('scoreRows').innerHTML = scoreRowsHtml;
    document.getElementById('strongSkills').innerHTML = strongSkillsHtml;
    document.getElementById('weakSkills').innerHTML = weakSkillsHtml;
    document.getElementById('recsList').innerHTML = recsHtml;
}

window.retryInterview = function() {
    document.getElementById('results').classList.remove('active');
    window.startInterview();
};

window.copyResults = function() {
    const role = document.getElementById('resultsRole').innerText;
    const grade = document.getElementById('resultsGrade').innerText;
    const verdict = document.getElementById('resultsVerdict').innerText;
    
    const textToCopy = `Interview Summary for ${role}\nOverall Performance Grade: ${grade} (${verdict})\nPracticed using AI Interview Coach.`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Results summary copied to clipboard!");
    }).catch(() => {
        alert("Could not automatically copy text.");
    });
};
