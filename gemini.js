
// 1. Put your API key inside the quotation marks below:
const GEMINI_API_KEY = "AQ.Ab8RN6Ll04W4LprJy3ur_nFbOlzUVIbUzJlnIfHYmAzzkoTTYg"; 

// Global state tracking interview questions and user scores
let currentInterviewQuestions = [];
let currentQuestionIndex = 0;
let interviewScores = [];

// Helper to format string responses to prevent common JSON issues
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

// Helper to compile metadata context for prompt engineering
function getExtraContext() {
    const company = document.getElementById('companyInput')?.value.trim() || "Unspecified Target Company";
    const industry = document.getElementById('industryInput')?.value.trim() || "General Industry Sector";
    const description = document.getElementById('jobDescInput')?.value.trim() || "Standard operational responsibilities";
    return { company, industry, description };
}

// Generates 35-40 custom questions tailored deeply by profession and baseline difficulty
async function generateInterviewQuestions(jobTitle, experienceLevel) {
    // FIXED: Cleaned up markdown formatting corruption and switched to stable 1.5 model endpoint
    const url = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$){GEMINI_API_KEY}`;
    const context = getExtraContext();

    const systemPrompt = `You are an elite, highly professional Senior HR Recruiter, Hiring Manager, Technical Interviewer, and Industry Expert combined.
Your objective is to design a realistic, fully customized, high-fidelity interview plan tailored exactly to the provided job title, experience level, and additional parameters.

CRITICAL STEP-BY-STEP INTERNAL ANALYSIS PATHWAY:
Before formulating any single question, you must thoroughly evaluate and infer the following attributes related to the profession:
1. Core daily operational workflows and unique metrics for performance success.
2. Hard skills, specialized domain tooling, specialized frameworks, hardware, or stack choices.
3. Universal industry regulations, corporate guidelines, certification rules, and methodologies.
4. Essential soft skills, collaborative pathways, conflict points, and communication demands.
5. Common interview themes, industry shifts, and typical filters used by real field experts.
6. Nuanced expectations between professional levels: Beginner/Junior vs Intermediate vs Advanced/Leadership.

GENERATION BLUEPRINT & FLOW RULES:
- Generate between 35 and 40 unique, realistic, highly specialized interview questions.
- Never repeat phrasing or baseline formats. Every profession must yield a radically different line of questioning.
- Avoid generic interview templates (e.g., do not ask generic things like "Tell me about a time you failed" unless heavily adapted to specific high-stakes profession metrics).
- Structure the pool dynamically into a continuous sequence that simulates an organic interview flow, transitioning naturally where later categories build upon operational concepts of earlier questions.
- Scale difficulty dynamically as the list index grows (Easy -> Medium -> Hard -> Expert).
- Approximate allocation bucket targets:
  * 5 HR / Alignment Questions
  * 5 Behavioral Questions
  * 5 Experience & Background Dynamics
  * 5 Technical Fundamentals / Basic Domain Systems
  * 5 Practical Skills / Live Operational Application Tasks
  * 5 Scenario-Based / Critical Incidents
  * 5 Complex Problem Solving Dilemmas
  * 3 Target Company / Cultural Values Fit Questions
  * 3 Leadership & Mentorship Operations (or cross-team design architectures if leadership is less relevant to target profile)
  * 4 Advanced Analytical or Strategic Progression Questions

You must output ONLY a valid JSON string. Do not wrap it in markdown block fences, do not write code comments, do not include extra introduction text, and do not append additional trailing text.

The JSON response format must strictly match this structure:
{
  "job": "Clean Job Title String",
  "questions": [
    {
      "id": 1,
      "category": "Category Label",
      "difficulty": "Easy",
      "question": "The actual text of the question tailored strictly to this role."
    }
  ]
}`;

    const userPrompt = `Generate a master customized interview set of 35-40 sequential questions for the profession: "${jobTitle}".
Baseline Experience Tier Target: "${experienceLevel}".
Target Company: "${context.company}"
Industry Context: "${context.industry}"
Job Description context elements: "${context.description}"

Ensure distinct adaptation. Avoid duplicates. Later questions should build on earlier concepts to preserve contextual flow. Return valid JSON only.`;

    let attempt = 0;
    while (attempt < 2) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (!response.ok) throw new Error(`Network status error: ${response.status}`);
            
            const data = await response.json();
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("Empty text token stream received from API.");
            
            const rawText = cleanJsonString(data.candidates[0].content.parts[0].text);
            const parsed = JSON.parse(rawText);

            if (parsed && Array.isArray(parsed.questions) && parsed.questions.length >= 35) {
                const validQuestions = [];
                const seenTexts = new Set();

                parsed.questions.forEach((q, index) => {
                    if (q.question && !seenTexts.has(q.question.toLowerCase())) {
                        seenTexts.add(q.question.toLowerCase());
                        validQuestions.push({
                            id: index + 1,
                            category: q.category || "Domain Practice",
                            difficulty: q.difficulty || "Standard",
                            question: q.question
                        });
                    }
                });

                if (validQuestions.length >= 30) {
                    return validQuestions;
                }
            }
        } catch (e) {
            console.warn(`Attempt ${attempt + 1} failed to construct valid interview payload. Retrying...`, e);
        }
        attempt++;
    }
    return null;
}

// Core function to call the Google Gemini API safely for real-time response evaluations
async function askGemini(question, userAnswer) {
    // FIXED: Cleaned up markdown formatting corruption and switched to stable 1.5 model endpoint
    const url = `[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$){GEMINI_API_KEY}`;
    const context = getExtraContext();

    const systemPrompt = `You are an expert AI Interview Evaluation Coach. Analyze the user's answer to the interview question provided.
You must critique the response comprehensively across these distinct performance matrices:
- Technical Accuracy (Domain correctness)
- Communication (Clarity and structural expression)
- Confidence (Decisiveness and narrative authority)
- Completeness (Answering all facets of the prompt promptly)
- Problem Solving (Analytical logic and pathing)
- Industry Knowledge (Application of professional metrics and terminology)
- Professionalism (Business alignment and delivery poise)

You MUST respond ONLY with a clean JSON object. Do not include markdown formatting, backticks, or trailing prose blocks outside the valid JSON.

The JSON structure must match this EXACTLY:
{
    "score": 8,
    "strengths": "Provide a thorough bulleted list or narrative of technical and communication items performed well.",
    "improvements": "Identify specific gaps where data, technical nuances, or framework steps were missing.",
    "suggested": "Give an actionable step-by-step strategy to restructure or optimize this specific answer.",
    "example": "Write a strong, professional example model answer customized to the targeted profession and company scenario.",
    "careerAdvice": "Provide custom, high-impact career progression insights based on the quality of domain expertise demonstrated."
}`;

    const userPrompt = `Target Profession Context:
Question: "${question}"
User Answer: "${userAnswer}"
Target Company Context: "${context.company}"
Target Industry Context: "${context.industry}"`;

    let attempt = 0;
    while (attempt < 2) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (!response.ok) throw new Error(`Network status error: ${response.status}`);

            const data = await response.json();
            const rawText = cleanJsonString(data.candidates[0].content.parts[0].text);
            return JSON.parse(rawText);
        } catch (error) {
            console.warn(`Evaluation pipeline error on attempt ${attempt + 1}:`, error);
        }
        attempt++;
    }
    return null;
}

// UI functions managing application layout transitions
function renderCurrentQuestion() {
    if (currentQuestionIndex >= currentInterviewQuestions.length) {
        finishAndShowResults();
        return;
    }

    const currentQ = currentInterviewQuestions[currentQuestionIndex];
    
    // Update headers and content trackers
    document.getElementById('qNum').innerText = `Q${currentQ.id}`;
    document.getElementById('qCategory').innerText = `${currentQ.category} · ${currentQ.difficulty}`;
    document.getElementById('qText').innerText = currentQ.question;
    
    // Update structural progress bar metrics
    const totalCount = currentInterviewQuestions.length;
    const progressPercent = (currentQuestionIndex / totalCount) * 100;
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
    document.getElementById('progressText').innerText = `Question ${currentQuestionIndex + 1} of ${totalCount}`;

    // Reset input states
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
    
    // Extract interactive user configs
    const roleTitle = selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === selectedRole)?.title;
        
    startBtn.innerHTML = `<span class="spinner"></span> Building customized interview...`;
    startBtn.disabled = true;

    const generated = await generateInterviewQuestions(roleTitle, selectedDiff);

    if (!generated || generated.length === 0) {
        alert("Friendly notice: We encountered an issue setting up the customized interview questions. Please verify your connection configuration or try again.");
        startBtn.innerHTML = originalBtnText;
        startBtn.disabled = false;
        return;
    }

    // Initialize simulation parameters
    currentInterviewQuestions = generated;
    currentQuestionIndex = 0;
    interviewScores = [];

    document.getElementById('headerRole').innerText = roleTitle || "Interviewee";
    document.getElementById('headerDiff').innerText = selectedDiff.toUpperCase();
    
    // Swap screen frames cleanly
    document.getElementById('landing').classList.remove('active');
    document.getElementById('interview').classList.add('active');
    
    // Restore primary landing frame start button text states
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
        
        // Append Career Advice parameters into example box safely
        const displayAdvice = feedback.careerAdvice ? `\n\nCareer Progression Tip: ${feedback.careerAdvice}` : "";
        document.getElementById('fbExample').innerText = `${feedback.example}${displayAdvice}`;
        
        document.getElementById('feedbackPanel').classList.add('visible');
        
        document.getElementById('meterBar').style.width = `${score * 10}%`;
        document.getElementById('meterVal').innerText = `${score * 10}%`;

        // Cache parameters to render final metrics overview page safely
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

    const roleTitle = selectedRole === 'custom' 
        ? document.getElementById('customRoleInput').value.trim() 
        : ROLES.find(r => r.id === selectedRole)?.title;

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

    // Collate dynamic Category breakdowns
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
              <div><strong>Expand on ${cat}:</strong> Focus on adding technical keywords, structural framework approaches, and practical business metrics to your examples.</div>
            </div>`;
        }
    });

    if (!strongSkillsHtml) strongSkillsHtml = '<div class="results-skill">General Baseline Answers</div>';
    if (!weakSkillsHtml) weakSkillsHtml = '<div class="results-skill">None identified. Consistent responses!</div>';
    if (!recsHtml) recsHtml = '<div class="rec-item"><div class="rec-num">✓</div><div>Fantastic session. Review alternate difficulty levels for more challenging industry problem tracks.</div></div>';

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
        alert("Could not automatically copy text to clipboard.");
    });
};
