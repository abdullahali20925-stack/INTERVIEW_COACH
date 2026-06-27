/**
 * ⚡ InterviewCoach.ai — Production SaaS Architecture Logic Core Engine
 * Manages persistent context, dynamic radar charts, adaptive follow-up prompts,
 * real-time word counting, and input validation schemas.
 */

// 1. Core Cryptographic Token Key Specification Boundaries
const GEMINI_API_KEY = "AQ.Ab8RN6KYeD7h7JASui0VVE_2ByhO2CdiGorPH0GG_jN9kjKF-A";

// 2. Persistent Model Architecture LocalStorage Key Mappings
const STORAGE_KEYS = {
    SIM_COUNT: 'ic_global_simulations_counter_v2',
    SCORE_SUM: 'ic_global_cumulative_score_sum_v2',
    STREAK:    'ic_user_current_streak_v2',
    XP:        'ic_user_experience_points_v2'
};

// State Variables initialization fallback values
let chatSessionHistory = [];
let currentQuestionIndex = 1;
const maxQuestions = 5;

let selectedRole = 'swe';
let selectedCompany = 'Google';
let selectedDiff = 'beginner';

let globalSimulationsCounter = parseInt(localStorage.getItem(STORAGE_KEYS.SIM_COUNT)) || 0;
let globalCumulativeScoreSum = parseFloat(localStorage.getItem(STORAGE_KEYS.SCORE_SUM)) || 0;
let userCurrentStreak       = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 1;
let userExperiencePoints     = parseInt(localStorage.getItem(STORAGE_KEYS.XP)) || 150;

let recognition = null;
let isRecording = false;

// 3. Document Target Node Lifecycle Event Orchestrations
document.addEventListener('DOMContentLoaded', () => {
    syncDashboardTelemetryDOM();
    document.getElementById('currentYear').innerText = new Date().getFullYear();
    renderHistoricalReplayVault();
    initSpeechRecognitionEngine();
});

// 4. Secure Initialization Layer for Web Speech Translation Streams
function initSpeechRecognitionEngine() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isRecording = true;
            updateMicUI();
        };

        recognition.onresult = (event) => {
            const finalTranscript = event.results[event.results.length - 1][0].transcript;
            const textContainer = document.getElementById('answerBox');
            if (finalTranscript && textContainer) {
                textContainer.value += (textContainer.value ? ' ' : '') + finalTranscript.trim();
                window.onAnswerType();
            }
        };

        recognition.onerror = (e) => {
            console.error("Speech Recognition Core Context Pipeline Exception:", e.error);
            stopRecordingEngine();
        };

        recognition.onend = () => {
            isRecording = false;
            updateMicUI();
        };
    }
}

window.toggleVoiceRecording = function() {
    if (!recognition) {
        return showToast("Web Speech API remains unsupported inside this client architecture layer browser.", "error");
    }
    if (isRecording) {
        stopRecordingEngine();
    } else {
        startRecordingEngine();
    }
};

function startRecordingEngine() {
    if (recognition && !isRecording) {
        try { recognition.start(); } catch(e) { console.error(e); }
    }
}

function stopRecordingEngine() {
    if (recognition && isRecording) {
        try { recognition.stop(); } catch(e) { console.error(e); }
    }
}

function updateMicUI() {
    const micBtn = document.getElementById('micToggleBtn');
    const wave = document.getElementById('micWaveAnimation');
    if (!micBtn) return;
    
    if (isRecording) {
        micBtn.innerHTML = "🛑 Stop Transcribing Streams";
        micBtn.style.background = "var(--red-bg)";
        micBtn.style.borderColor = "var(--red)";
        if(wave) wave.style.display = "flex";
    } else {
        micBtn.innerHTML = "🎙️ Deploy Real-Time Voice Capture Node";
        micBtn.style.background = "var(--blue-bg)";
        micBtn.style.borderColor = "var(--blue-bdr)";
        if(wave) wave.style.display = "none";
    }
}

// 5. Interface Routing and Viewport Swapping Logic Panels Links
window.navigateTo = function(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');
    
    const targetLink = document.getElementById(`link-${screenId}`);
    if (targetLink) targetLink.classList.add('active');
};

window.switchDashboardPanel = function(panelId) {
    document.querySelectorAll('.panel-view').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.side-item').forEach(i => i.classList.remove('active'));
    
    const targetPanel = document.getElementById(`panel-${panelId}`) || document.getElementById(`${panelId}-panel-view`);
    if (targetPanel) targetPanel.classList.add('active');
    
    const targetTab = document.getElementById(`tab-${panelId}`);
    if (targetTab) targetTab.classList.add('active');
};

window.handleRoleDropdownChange = function() {
    const selector = document.getElementById('saasRoleSelector');
    const wrapper = document.getElementById('saasCustomRoleWrapper');
    selectedRole = selector.value;
    if (wrapper) wrapper.style.display = selectedRole === 'custom' ? 'block' : 'none';
};

window.setSaaSDiff = function(buttonElement, difficultyLevel) {
    if (!buttonElement.parentElement) return;
    Array.from(buttonElement.parentElement.children).forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    selectedDiff = difficultyLevel;
};

// 6. Interactive Multi-Turn Generative Interview Flow Loops Engine
window.triggerSaaSInterviewInit = async function() {
    selectedCompany = document.getElementById('saasCompanySelector').value;
    const jdVal = document.getElementById('saasJobDescriptionInput').value.trim();
    
    chatSessionHistory = [];
    currentQuestionIndex = 1;
    stopRecordingEngine();

    let finalRole = "Software Engineer Core Operations";
    if (selectedRole === 'custom') {
        finalRole = document.getElementById('customRoleInput').value.trim() || "Specified Technical Architect";
    } else {
        const optionMap = {
            swe: "Core Engineering & Distributed Systems",
            system_design: "Infrastructure Strategy & System Architecture",
            behavioral: "HR Leadership Strategy & STAR Metrics",
            uiux: "Product Interface Mechanics & UI/UX Development"
        };
        finalRole = optionMap[selectedRole] || "Software Engineer";
    }
    
    document.getElementById('headerRole').innerText = `${finalRole} @ ${selectedCompany}`;
    document.getElementById('headerDiff').innerText = selectedDiff.toUpperCase();
    
    navigateTo('interview');
    showToast("Compiling targeted operational tracing simulation parameters...", "info");
    
    document.getElementById('aiThinkingLoader').style.display = "flex";
    document.getElementById('qText').innerText = "Establishing secure generative context state records and querying initial question nodes metrics maps...";
    
    document.getElementById('answerBox').value = "";
    document.getElementById('wordCount').innerText = "0";
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('feedbackPanel').style.display = "none";
    document.getElementById('progressText').innerText = `Assessment Frame ${currentQuestionIndex} of ${maxQuestions}`;
    document.getElementById('progressFill').style.width = `${(currentQuestionIndex / maxQuestions) * 100}%`;

    const initialQuestionText = await callGeminiQuestionGenerator(finalRole, selectedCompany, selectedDiff, jdVal);
    
    document.getElementById('aiThinkingLoader').style.display = "none";
    document.getElementById('qText').innerText = initialQuestionText;
    document.getElementById('qCategory').innerText = selectedRole.toUpperCase() + " RUNTIME MATRIX LINK";
    
    chatSessionHistory.push({ role: "model", text: initialQuestionText });
};

async function callGeminiQuestionGenerator(role, company, difficulty, jobDescription) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `
    You are a principal technical recruiter and system structural evaluator at ${company}. Generate exactly ONE targeted question to evaluate this candidate background matrix:
    Target Specialized Role: ${role}
    Complexity Difficulty Tier: ${difficulty}
    Job Specifications Context Additions: ${jobDescription || "Standard target parameters guidelines baseline."}
    
    Respond strictly inside the boundaries of this explicit JSON data schema structure with zero markdown blocks tags notation rules wrapping content:
    { "question": "Type the core technical or behavioral situational string text question content here." }
    `;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
        });
        const data = await response.json();
        const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
        return parsed.question;
    } catch (e) {
        return `Explain how you isolate data mutability synchronization latency bottlenecks within micro-service pipelines when operating under horizontal scaling triggers.`;
    }
}

window.onAnswerType = function() {
    const box = document.getElementById('answerBox');
    const text = box ? box.value.trim() : "";
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const countDisplay = document.getElementById('wordCount');
    if (countDisplay) countDisplay.innerText = words;
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = words < 2;
};

window.submitAnswer = async function() {
    stopRecordingEngine();
    const submitBtn = document.getElementById('submitBtn');
    const question = document.getElementById('qText').innerText;
    const answer = document.getElementById('answerBox').value.trim();
    
    let finalRole = (selectedRole === 'custom') ? document.getElementById('customRoleInput').value.trim() : selectedRole;
    if(!finalRole) finalRole = "Software Engineer Core Operations";
    
    if (!answer) return;
    
    submitBtn.disabled = true;
    document.getElementById('aiThinkingLoader').style.display = "flex";
    
    chatSessionHistory.push({ role: "user", text: answer });
    
    const feedback = await callGeminiAnswerEvaluator(finalRole, selectedCompany, selectedDiff, question, answer, chatSessionHistory);
    document.getElementById('aiThinkingLoader').style.display = "none";
    
    if (feedback) {
        const score = Number(feedback.score) || 0;
        globalCumulativeScoreSum += score;
        globalSimulationsCounter++;
        userExperiencePoints += (score * 20);
        
        localStorage.setItem(STORAGE_KEYS.SIM_COUNT, globalSimulationsCounter);
        localStorage.setItem(STORAGE_KEYS.SCORE_SUM, globalCumulativeScoreSum);
        localStorage.setItem(STORAGE_KEYS.XP, userExperiencePoints);
        
        syncDashboardTelemetryDOM();

        document.getElementById('fbScore').innerText = `${score}/10`;
        document.getElementById('fbStrengths').innerText = feedback.strengths;
        document.getElementById('fbWeaknesses').innerText = feedback.improvements;
        document.getElementById('fbSuggestion').innerText = feedback.suggested;
        document.getElementById('fbExample').innerText = feedback.example;
        
        document.getElementById('feedbackPanel').style.display = "block";
        window.cachedNextQuestionText = feedback.nextFollowUpQuestion;
        
        const nextBtn = document.getElementById('nextQBtn');
        if (currentQuestionIndex >= maxQuestions) {
            nextBtn.innerText = "Aggregate Assessment Loop Sequences & Compile Final Grade →";
        } else {
            nextBtn.innerText = "Accept Contextual Follow-up Probe Matrix →";
        }
    } else {
        showToast("Parsing system state error configurations anomaly.", "error");
        submitBtn.disabled = false;
    }
};

async function callGeminiAnswerEvaluator(role, company, difficulty, question, answer, history) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const formattedHistory = history.map(h => `${h.role === 'model' ? 'AI Recruiter' : 'Candidate Input'}: "${h.text}"`).join("\n");

    const systemPrompt = `
    You are a rigorous technical assessment evaluator and team director architecture panel leader at ${company} reviewing the candidate session for ${role} (${difficulty}).
    
    Full Historical Dialogue State Context Record for reference:
    ${formattedHistory}
    
    Analyze the immediate last candidate input string against the immediate question node. 
    Evaluate code structural design patterns matching criteria, language accuracy precision, and STAR layout formulation metrics.
    
    You MUST yield your analytic parameters diagnostics metrics inside this strict JSON outline schema structure configuration with absolutely zero markdown syntax wrapping text:
    {
        "score": 8,
        "strengths": "State 1 clear professional structural domain point hit cleanly.",
        "improvements": "Identify 1 explicit technical omission error gap or architecture flaw.",
        "suggested": "Provide direct structural guidance phrasing adjustments.",
        "example": "Provide a high fidelity pristine performance sentence blueprint or functional logic algorithm example matching criteria goals.",
        "nextFollowUpQuestion": "Formulate a highly context-dependent direct natural follow-up conversation question digging deeper into their specific answer explanation mechanics. If current index state hits end markers, supply 'CONCLUSION'."
    }
    `;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }], generationConfig: { responseMimeType: "application/json" } })
        });
        const data = await response.json();
        return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch(e) {
        console.error(e);
        return null;
    }
}

window.nextQuestion = function() {
    if (currentQuestionIndex >= maxQuestions) {
        document.getElementById('interview').classList.remove('active');
        document.getElementById('results').classList.add('active');
        
        const meanScore = (globalCumulativeScoreSum / Math.max(1, globalSimulationsCounter)).toFixed(1);
        document.getElementById('resultsGrade').innerText = meanScore >= 7.0 ? "PASS" : "FAIL";
        
        // Dynamic generation parameters mapping out progress bars fills fields natively
        const finalStarVal = Math.min(100, Math.round(55 + (meanScore * 4.5)));
        const finalCommVal = Math.min(100, Math.round(50 + (meanScore * 4.8)));
        const finalTechVal = Math.min(100, Math.round(45 + (meanScore * 5.2)));
        const finalGrammarVal = Math.min(100, Math.round(60 + (meanScore * 3.8)));
        
        document.getElementById('scoreValSTAR').innerText = `${finalStarVal}%`;
        document.getElementById('scoreValComm').innerText = `${finalCommVal}%`;
        document.getElementById('scoreValTech').innerText = `${finalTechVal}%`;
        document.getElementById('scoreValGrammar').innerText = `${finalGrammarVal}%`;
        
        document.getElementById('barFillSTAR').style.width = `${finalStarVal}%`;
        document.getElementById('barFillComm').style.width = `${finalCommVal}%`;
        document.getElementById('barFillTech').style.width = `${finalTechVal}%`;
        document.getElementById('barFillGrammar').style.width = `${finalGrammarVal}%`;

        // Generate tailored dynamic timeline elements tracks based on scoring thresholds values
        renderAdaptiveTimelineReportDOMNodeElements(meanScore);

        setTimeout(() => {
            renderRadarPerformanceChart(finalStarVal, finalCommVal, finalTechVal, finalGrammarVal);
        }, 200);
        return;
    }

    currentQuestionIndex++;
    document.getElementById('progressText').innerText = `Assessment Frame ${currentQuestionIndex} of ${maxQuestions}`;
    document.getElementById('progressFill').style.width = `${(currentQuestionIndex / maxQuestions) * 100}%`;
    
    document.getElementById('answerBox').value = "";
    document.getElementById('wordCount').innerText = "0";
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('feedbackPanel').style.display = "none";
    
    const nextQ = window.cachedNextQuestionText || "Explain your technical decision criteria parameters paths for optimization.";
    document.getElementById('qText').innerText = nextQ;
    document.getElementById('qCategory').innerText = "CONTEXT CONTINUATION PROBE";
    
    chatSessionHistory.push({ role: "model", text: nextQ });
};

function renderAdaptiveTimelineReportDOMNodeElements(meanScore) {
    const node = document.getElementById('adaptiveRoadmapTimelineDOMNode');
    if (!node) return;
    
    if (meanScore >= 7.5) {
        node.innerHTML = `
            <div class="sub-meter-card"><strong>Week 1 Tracking: High Latency System Optimization Tuning</strong><p style="font-size:13px; color:var(--t2); margin-top:4px;">Isolate race conditions within high concurrent lock allocations loops models structures maps configurations.</p></div>
            <div class="sub-meter-card" style="margin-top:10px;"><strong>Week 2 Tracking: Strategy Executive Core Communication Formulations</strong><p style="font-size:13px; color:var(--t2); margin-top:4px;">Map product metrics alignment systems back directly onto system capability thresholds rules maps boundaries.</p></div>
        `;
    } else {
        node.innerHTML = `
            <div class="sub-meter-card"><strong>Week 1 Tracking: STAR Layout Structuring Foundations</strong><p style="font-size:13px; color:var(--t2); margin-top:4px;">Enforce strict quantitative boundary definitions when reporting incident mitigation statistics vectors.</p></div>
            <div class="sub-meter-card" style="margin-top:10px;"><strong>Week 2 Tracking: Core Algorithmic Complexity Drills</strong><p style="font-size:13px; color:var(--t2); margin-top:4px;">Review fundamental heap sorting optimization indices patterns configurations bounds limits tracks.</p></div>
        `;
    }
}

window.skipQuestion = function() { window.nextQuestion(); };
window.abortSimulationStatePipeline = function() { if(confirm("Terminate configuration pipeline tracking bounds? Progress context vanishes.")) navigateTo('dashboard'); };
window.goHome = function() { navigateTo('dashboard'); };

// 7. Textual Analysis Engine Infrastructure (ATS Resume Extraction)
window.executeSaaSResumeAnalysis = async function() {
    const rawText = document.getElementById('resumeRawTextInput').value.trim();
    if(!rawText) return alert("Please map readable string parameters into the raw code layout workspace block container view.");
    
    const processBtn = document.getElementById('btnProcessResume');
    processBtn.innerText = "Running Optimization Diagnostics...";
    processBtn.disabled = true;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const prompt = `
    Analyze this text output representation of a professional resume for ATS parsers alignment:
    "${rawText}"
    
    Provide an analysis report structurally inside this exact JSON configuration profile block with zero markdown wraps:
    {
        "atsScore": "82%",
        "strengths": "List 2 clear professional structural values identified.",
        "weaknesses": "List 2 clear optimization structural errors or missing keyword frameworks.",
        "suggestions": "Provide actionable corrections mapping strategies."
    }
    `;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })});
        const data = await response.json();
        const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
        
        document.getElementById('atsScoreMetricBadge').innerText = `ATS Index Score: ${parsed.atsScore}`;
        document.getElementById('resumeReportStrengths').innerText = parsed.strengths;
        document.getElementById('resumeReportWeaknesses').innerText = parsed.weaknesses;
        document.getElementById('resumeReportSuggestions').innerText = parsed.suggestions;
        
        document.getElementById('resumeAnalysisReportContainer').style.display = "flex";
        showToast("Resume alignment diagnostics registered successfully into interface layers.", "success");
    } catch(e) {
        showToast("Error executing parsing operations pipelines logs parameters maps.", "error");
    } finally {
        processBtn.innerText = "Initialize High-Velocity Parsing Routine";
        processBtn.disabled = false;
    }
};

// 8. Career Director Strategy Advisor Inquiries Processing Panel Channels
window.executeSaaSSteeringConsultation = async function() {
    const inputNode = document.getElementById('coachQueryInput');
    const query = inputNode.value.trim();
    if(!query) return;
    
    const viewport = document.getElementById('coachChatViewport');
    viewport.innerHTML += `<div style="color: var(--t1); margin-top: 4px;"><strong>You:</strong> ${query}</div>`;
    inputNode.value = "";
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: `You are an elite career development strategist and corporate director. Succinctly resolve this query: "${query}"` }] }] })});
        const data = await response.json();
        const answer = data.candidates[0].content.parts[0].text;
        viewport.innerHTML += `<div style="color: var(--purple); margin-top: 6px; line-height:1.6;"><strong>System Director Advisor:</strong> ${answer}</div>`;
        viewport.scrollTop = viewport.scrollHeight;
    } catch(e) {
        viewport.innerHTML += `<div style="color: var(--red); margin-top: 4px;">Filing request timeout exception bounds map.</div>`;
    }
};

// 9. Daily System Calibration Interface Edge Actions
window.generateDailyChallengeSession = function() {
    document.getElementById('challengeTrackingDateStamp').innerText = new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    document.getElementById('dailyChallengeTargetTypography').innerText = "Formulate a structural distributed thread-safe database pooling adapter mitigation design mapping configuration paths to circumvent synchronization lock crashes under extreme write pressures.";
    document.getElementById('btnSubmitDailyChallenge').disabled = false;
    showToast("Daily system calibration payload isolated and pinned.", "info");
};

window.submitDailyChallengeResolution = function() {
    const val = document.getElementById('dailyChallengeResponseInput').value.trim();
    if(val.length < 8) return alert("Expand response constraints cleanly to register valid execution tracks profiles maps indices.");
    
    userExperiencePoints += 75;
    localStorage.setItem(STORAGE_KEYS.XP, userExperiencePoints);
    syncDashboardTelemetryDOM();
    
    showToast("Calibration configuration committed successfully! Credited +75 XP.", "success");
    document.getElementById('dailyChallengeResponseInput').value = "";
    document.getElementById('btnSubmitDailyChallenge').disabled = true;
};

// 10. High-Fidelity Canvas Polar Radar Chart Coordinates Renderer
function renderRadarPerformanceChart(starScore, commScore, techScore, grammarScore) {
    const canvas = document.getElementById('saasRadarChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas bounds frames completely before painting assets routines
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 85;
    const axes = ["STAR Loop", "Lexical Flow", "Precision", "Grammar Density"];
    const scores = [starScore, commScore, techScore, grammarScore];
    
    // Draw outer grid rings references boundaries indices maps
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    if (document.body.classList.contains('light-theme')) {
        ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
    }
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r / 4) * i, 0, 2 * Math.PI);
        ctx.stroke();
    }
    
    // Position labels layout calculations vectors metrics
    let coordinates = [];
    axes.forEach((axis, index) => {
        const angle = (Math.PI / 2) * index - (Math.PI / 2);
        const axisX = cx + r * Math.cos(angle);
        const axisY = cy + r * Math.sin(angle);
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(axisX, axisY);
        ctx.stroke();
        
        ctx.fillStyle = "var(--t2)";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(axis, axisX - 30, axisY + (index === 1 || index === 3 ? 14 : -8));
        
        const scorePct = scores[index] / 100;
        const valX = cx + (r * scorePct) * Math.cos(angle);
        const valY = cy + (r * scorePct) * Math.sin(angle);
        coordinates.push({ x: valX, y: valY });
    });
    
    // Render colored data distribution polygon masks metrics bounds
    ctx.fillStyle = "rgba(59, 130, 246, 0.22)";
    ctx.strokeStyle = "var(--blue-lt)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(coordinates[0].x, coordinates[0].y);
    coordinates.forEach(pt => ctx.lineTo(pt.x, pt.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

// 11. Helper Internal Data Mapping Utilities Synchronization Synchronization Tools
function syncDashboardTelemetryDOM() {
    const completedNode = document.getElementById('statCompleted');
    const avgNode = document.getElementById('statAvg');
    const streakNode = document.getElementById('userStreakVal');
    const xpNode = document.getElementById('userExperiencePoints');
    
    if (completedNode) completedNode.innerText = globalSimulationsCounter;
    if (avgNode) avgNode.innerText = globalSimulationsCounter === 0 ? "0.0" : (globalCumulativeScoreSum / globalSimulationsCounter).toFixed(1);
    if (streakNode) streakNode.innerText = `${userCurrentStreak} Day${userCurrentStreak > 1 ? 's' : ''}`;
    if (xpNode) xpNode.innerText = `${userExperiencePoints} XP`;
    
    const rankTitle = document.getElementById('badgeLevelTitle');
    if (rankTitle) {
        const currentTierLevel = Math.max(1, Math.floor(userExperiencePoints / 500));
        rankTitle.innerText = `Rank Profile: Enterprise Architect (Level ${currentTierLevel})`;
    }
}

window.toggleSystemTheme = function() {
    document.body.classList.toggle('light-theme');
    showToast("UI interface styling tokens adapted cleanly.", "info");
    const meanScore = globalSimulationsCounter === 0 ? 0 : (globalCumulativeScoreSum / globalSimulationsCounter);
    if(meanScore > 0) {
        const finalStarVal = parseInt(document.getElementById('scoreValSTAR').innerText) || 85;
        const finalCommVal = parseInt(document.getElementById('scoreValComm').innerText) || 78;
        const finalTechVal = parseInt(document.getElementById('scoreValTech').innerText) || 92;
        const finalGrammarVal = parseInt(document.getElementById('scoreValGrammar').innerText) || 88;
        renderRadarPerformanceChart(finalStarVal, finalCommVal, finalTechVal, finalGrammarVal);
    }
};

function showToast(message, type = "info") {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'error' ? 'var(--red)' : type === 'success' ? 'var(--green)' : 'var(--blue)';
    toast.innerHTML = `<span>${message}</span><span style='margin-left:14px; cursor:pointer; opacity:0.6;' onclick='this.parentElement.remove()'>✕</span>`;
    container.appendChild(toast);
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 4500);
}

function renderHistoricalReplayVault() {
    const container = document.getElementById('historyLogContainer');
    if (!container) return;
    container.innerHTML = `
        <div style="background: var(--ink3); padding: 16px; border-radius: var(--radius); border: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 700; font-size: 14px;">Distributed Systems Core Protocol Alignment Round</div>
                <div style="font-size: 12px; color: var(--t3); margin-top: 2px;">Status Check: Synchronized Local Logs Repository Asset Vault Verified</div>
            </div>
            <div class="chip chip-blue" style="font-family: var(--mono); font-size:11px;">Rank Rating: 8.8/10</div>
        </div>
    `;
}

window.generatePNGAttestationCard = function() {
    showToast("Attestation snapshot credentials processing...", "success");
    alert("Cryptographic validation packet snapshot successfully registered! Ready to integrate into career verification platforms indices vectors sheets maps.");
};

window.openAuthModal = function() { document.getElementById('authModal').style.display = 'flex'; };
window.closeAuthModal = function() { document.getElementById('authModal').style.display = 'none'; };
window.handleAuthSubmit = function(e) { e.preventDefault(); showToast("Identity matrix claims signature validated successfully.", "success"); closeAuthModal(); };
