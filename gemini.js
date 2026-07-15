
// ============================================================
// AI Interview Coach — Gemini engine
// ============================================================
// 1. Put your API key inside the quotation marks below:
const GEMINI_API_KEY = "AQ.Ab8RN6ILKRqcOAsfj9swvtz-m0ZV5fw9YGSR4Prrz8ksOC9X4Q";

// ⚠️ SECURITY NOTE: this key is embedded in client-side JS. If this repo is
// public on GitHub, anyone can read it straight out of the source. At minimum,
// restrict the key to your site's domain (Google AI Studio / Cloud Console ->
// API key -> "Set an application restriction" -> HTTP referrers), or better,
// proxy requests through a small serverless function so the key never ships
// to the browser at all.

const MODEL = "gemini-flash-latest";
// NOTE: as of mid-2026 Google is moving keys created in AI Studio to the new
// "Auth key" format (starts with "AQ."). These must be sent via the
// x-goog-api-key HEADER, not the old ?key=... query string, or you'll get a
// 401 ACCESS_TOKEN_TYPE_UNSUPPORTED error. This works for both AQ. and the
// older AIza... keys, so it's safe either way.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ------------------------------------------------------------
// Low-level helper: call Gemini, force clean JSON back
// ------------------------------------------------------------
async function callGemini(systemPrompt, userPrompt, temperature = 0.9) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Empty response from Gemini");

    return JSON.parse(rawText);
}

// ------------------------------------------------------------
// Generate a full, role-specific question set
// ------------------------------------------------------------
async function generateQuestions(role, difficulty, count) {
    const systemPrompt = `
You are a veteran hiring manager and interview coach who has run hundreds of real
interviews for the "${role}" role and knows the questions candidates are most
frequently asked for this field at real companies.

Generate a realistic mock interview question set for someone preparing for a
"${role}" interview.

Requirements:
- Return exactly ${count} questions.
- Base them on the kinds of questions that are ACTUALLY and COMMONLY asked in
  real "${role}" interviews — introduction/warm-up, behavioral (STAR-style),
  role-specific technical or functional knowledge, situational/scenario-based,
  and communication/culture-fit questions.
- The candidate's target difficulty is "${difficulty}". Skew the set toward
  that level, but include a few easier warm-up questions at the start and,
  if the target isn't "beginner", a couple of tougher stretch questions later
  so it feels like a real, progressively-challenging interview.
- Each question needs a "category" — one of exactly: "Introduction",
  "Behavioral", "Technical", "Situational", "Problem Solving", "Communication".
- Each question needs a "difficulty" — one of exactly: "beginner",
  "intermediate", "advanced".
- Order the questions the way a real interview actually flows: start with
  introduction/warm-up, move into technical/behavioral, then situational,
  and end with a couple of harder or reflective questions.
- No duplicate or near-duplicate questions.

Respond ONLY with a JSON object, no markdown, no backticks, no extra text,
matching EXACTLY this shape:
{"questions":[{"question":"...","category":"Technical","difficulty":"beginner"}]}
`.trim();

    const userPrompt = `Role: ${role}\nTarget difficulty: ${difficulty}\nNumber of questions: ${count}`;

    const data = await callGemini(systemPrompt, userPrompt, 1.0);
    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No questions returned");
    }
    return data.questions;
}

// ------------------------------------------------------------
// Per-answer feedback (kept close to the original, hardened)
// ------------------------------------------------------------
async function askGemini(question, userAnswer) {
    const systemPrompt = `
You are an expert Interview Coach. Analyze the user's answer to the interview
question provided. Respond ONLY with a clean JSON object — no markdown,
backticks, or text outside the JSON block.

The JSON structure must match this EXACTLY:
{
    "score": 8,
    "strengths": "1-2 detailed points highlighting what they did well.",
    "improvements": "1-2 details on what key information or structure was missing.",
    "suggested": "A quick, actionable tip on how to restructure or improve this specific answer.",
    "example": "A strong, professional example answer based on the user's situation."
}
`.trim();

    const userPrompt = `Interview Question: "${question}"\nUser's Answer: "${userAnswer}"`;

    try {
        return await callGemini(systemPrompt, userPrompt, 0.7);
    } catch (error) {
        console.error("Error communicating with Gemini:", error);
        return null;
    }
}

// ------------------------------------------------------------
// End-of-interview report, generated from the full transcript
// ------------------------------------------------------------
async function generateOverallSummary(role, results) {
    const systemPrompt = `
You are an expert interview coach reviewing a candidate's full mock interview
transcript for a "${role}" role — every question asked, their answer, the
per-question score out of 10 (or "skipped"), and notes on what was missing.

Write an honest, encouraging, and genuinely useful end-of-interview report
that will help this person walk into their real interview more confident.

Respond ONLY with a JSON object, no markdown, matching EXACTLY:
{
  "grade": "B+",
  "verdict": "A short 3-6 word overall verdict",
  "subtitle": "One sentence summarizing their overall readiness and biggest theme.",
  "strongSkills": ["Specific strength 1", "Specific strength 2"],
  "weakSkills": ["Specific gap 1", "Specific gap 2"],
  "recommendations": ["Specific, actionable next step 1", "step 2", "step 3"]
}
`.trim();

    const userPrompt = `Role: ${role}\n\nTranscript:\n` + results.map((r, i) =>
        `Q${i + 1} [${r.category}]: ${r.question}\nAnswer: ${r.answer}\nScore: ${r.score ?? "skipped"}\nNotes: ${r.improvements || ""}`
    ).join("\n\n");

    return await callGemini(systemPrompt, userPrompt, 0.6);
}

// ============================================================
// App state
// ============================================================
let interviewQuestions = [];
let currentQIndex = 0;
let interviewResults = [];
let currentRoleTitle = "";

// ------------------------------------------------------------
// Start interview: generate the full question set up front
// ------------------------------------------------------------
window.startInterview = async function () {
    const roleTitle = selectedRole === 'custom'
        ? document.getElementById('customRoleInput').value.trim()
        : ROLES.find(r => r.id === selectedRole)?.title;

    currentRoleTitle = roleTitle || "Interviewee";

    const startBtn = document.getElementById('startBtn');
    const originalLabel = startBtn.innerHTML;
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="spinner"></span> Generating your interview…';

    const count = typeof selectedQCount !== 'undefined' && selectedQCount ? selectedQCount : 8;

    try {
        interviewQuestions = await generateQuestions(currentRoleTitle, selectedDiff, count);
    } catch (err) {
        console.error("Question generation failed:", err);
        alert("Couldn't generate questions right now. Please check your connection/API key and try again.");
        startBtn.disabled = false;
        startBtn.innerHTML = originalLabel;
        return;
    }

    currentQIndex = 0;
    interviewResults = [];

    document.getElementById('headerRole').innerText = currentRoleTitle;
    document.getElementById('headerDiff').innerText = selectedDiff.toUpperCase();

    document.getElementById('results').classList.remove('active');
    document.getElementById('landing').classList.remove('active');
    document.getElementById('interview').classList.add('active');

    renderQuestion();

    startBtn.disabled = false;
    startBtn.innerHTML = originalLabel;
};

// Render whatever question currentQIndex points at
function renderQuestion() {
    const q = interviewQuestions[currentQIndex];

    document.getElementById('qNum').innerText = `Q${currentQIndex + 1}`;
    document.getElementById('qText').innerText = q.question;
    document.getElementById('qCategory').innerText = q.category || 'General';

    document.getElementById('progressText').innerText =
        `Question ${currentQIndex + 1} of ${interviewQuestions.length}`;
    document.getElementById('progressFill').style.width =
        `${Math.round((currentQIndex / interviewQuestions.length) * 100)}%`;

    document.getElementById('answerBox').value = "";
    document.getElementById('wordCount').innerText = "0";
    document.getElementById('meterBar').style.width = "0%";
    document.getElementById('meterVal').innerText = "—";
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('feedbackPanel').classList.remove('visible');
}

// ------------------------------------------------------------
// Word count / submit button enable
// ------------------------------------------------------------
window.onAnswerType = function () {
    const box = document.getElementById('answerBox');
    const text = box.value.trim();
    const words = text ? text.split(/\s+/).length : 0;

    document.getElementById('wordCount').innerText = words;
    document.getElementById('submitBtn').disabled = words < 5;
};

// ------------------------------------------------------------
// Submit an answer, get feedback, store it for the final report
// ------------------------------------------------------------
window.submitAnswer = async function () {
    const submitBtn = document.getElementById('submitBtn');
    const q = interviewQuestions[currentQIndex];
    const answer = document.getElementById('answerBox').value.trim();

    if (!answer) return;

    submitBtn.innerText = "Analyzing answer...";
    submitBtn.disabled = true;

    const feedback = await askGemini(q.question, answer);

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
        document.getElementById('fbExample').innerText = feedback.example;

        document.getElementById('feedbackPanel').classList.add('visible');

        document.getElementById('meterBar').style.width = `${score * 10}%`;
        document.getElementById('meterVal').innerText = `${score * 10}%`;

        interviewResults.push({
            question: q.question,
            category: q.category,
            difficulty: q.difficulty,
            answer,
            score,
            strengths: feedback.strengths,
            improvements: feedback.improvements
        });
    } else {
        alert("Unable to process feedback. Check your API key or connection.");
    }

    submitBtn.innerText = "Get feedback";
    submitBtn.disabled = false;
};

// ------------------------------------------------------------
// Advance to next question, or finish and show the report
// ------------------------------------------------------------
window.nextQuestion = function () {
    currentQIndex++;
    if (currentQIndex < interviewQuestions.length) {
        renderQuestion();
    } else {
        showResults();
    }
};

window.skipQuestion = function () {
    const q = interviewQuestions[currentQIndex];
    interviewResults.push({
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        answer: "(skipped)",
        score: null,
        strengths: "",
        improvements: ""
    });

    currentQIndex++;
    if (currentQIndex < interviewQuestions.length) {
        renderQuestion();
    } else {
        showResults();
    }
};

// ------------------------------------------------------------
// Final report screen
// ------------------------------------------------------------
async function showResults() {
    document.getElementById('interview').classList.remove('active');
    document.getElementById('results').classList.add('active');

    document.getElementById('resultsRole').innerText = currentRoleTitle;
    document.getElementById('resultsGrade').innerText = '…';
    document.getElementById('resultsVerdict').innerText = 'Analyzing your overall performance…';
    document.getElementById('resultsSubtitle').innerText = '';
    document.getElementById('strongSkills').innerText = '–';
    document.getElementById('weakSkills').innerText = '–';
    document.getElementById('recsList').innerText = '–';

    // Per-category score breakdown — computed locally, always available
    const byCategory = {};
    interviewResults.forEach(r => {
        if (r.score == null) return;
        if (!byCategory[r.category]) byCategory[r.category] = [];
        byCategory[r.category].push(r.score);
    });

    const rowsHtml = Object.entries(byCategory).map(([cat, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const pct = Math.round(avg * 10);
        return `<div class="srow">
            <span class="srow-lbl">${cat}</span>
            <div class="srow-bar"><div class="srow-fill" style="width:${pct}%"></div></div>
            <span class="srow-val">${pct}%</span>
        </div>`;
    }).join('');
    document.getElementById('scoreRows').innerHTML =
        rowsHtml || '<div class="srow-lbl">No answered questions to score.</div>';

    // AI-written overall verdict + personalized recommendations
    let summary = null;
    try {
        summary = await generateOverallSummary(currentRoleTitle, interviewResults);
    } catch (err) {
        console.error("Overall summary failed:", err);
    }

    if (summary) {
        document.getElementById('resultsGrade').innerText = summary.grade || '–';
        document.getElementById('resultsVerdict').innerText = summary.verdict || '';
        document.getElementById('resultsSubtitle').innerText = summary.subtitle || '';

        document.getElementById('strongSkills').innerHTML =
            (summary.strongSkills || []).map(s => `<div>✓ ${s}</div>`).join('') || '–';
        document.getElementById('weakSkills').innerHTML =
            (summary.weakSkills || []).map(s => `<div>→ ${s}</div>`).join('') || '–';
        document.getElementById('recsList').innerHTML =
            (summary.recommendations || []).map((r, i) =>
                `<div class="rec-item"><span class="rec-num">${String(i + 1).padStart(2, '0')}</span><span>${r}</span></div>`
            ).join('') || '–';
    } else {
        // Local fallback if the summary call fails
        const answered = interviewResults.filter(r => r.score != null);
        const avg = answered.length ? answered.reduce((a, b) => a + b.score, 0) / answered.length : 0;

        document.getElementById('resultsGrade').innerText = avg >= 8 ? 'A' : avg >= 6.5 ? 'B' : avg >= 5 ? 'C' : 'D';
        document.getElementById('resultsVerdict').innerText = avg >= 8 ? 'Great job!' : avg >= 6.5 ? 'Good progress' : 'Keep practicing';
        document.getElementById('resultsSubtitle').innerText =
            `You averaged ${avg.toFixed(1)}/10 across ${answered.length} of ${interviewQuestions.length} answered questions.`;
        document.getElementById('recsList').innerText =
            'Review the feedback on each question above for detailed tips.';
    }
}

// ------------------------------------------------------------
// Practice again with the same role/difficulty/count
// ------------------------------------------------------------
window.retryInterview = function () {
    document.getElementById('results').classList.remove('active');
    window.startInterview();
};

// ------------------------------------------------------------
// Copy a plain-text summary of the results
// ------------------------------------------------------------
window.copyResults = function () {
    const role = document.getElementById('resultsRole').innerText;
    const grade = document.getElementById('resultsGrade').innerText;
    const verdict = document.getElementById('resultsVerdict').innerText;
    const subtitle = document.getElementById('resultsSubtitle').innerText;

    let text = `Interview Practice Results — ${role}\nGrade: ${grade} (${verdict})\n${subtitle}\n\n`;
    interviewResults.forEach((r, i) => {
        text += `Q${i + 1} [${r.category}]: ${r.question}\nScore: ${r.score ?? 'Skipped'}\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        alert('Results copied to clipboard!');
    }).catch(() => {
        alert('Could not copy automatically — please select and copy the text manually.');
    });
};
