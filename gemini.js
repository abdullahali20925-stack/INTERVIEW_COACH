// ==========================================
// 1. GLOBAL STATE & CONFIGURATION
// ==========================================
const WORKER_URL = "https://interviewcoach.abdullahali20925.workers.dev/";

let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];

// ==========================================
// 2. CORE INTERVIEW FLOW PIPELINE
// ==========================================

/**
 * Single-entrypoint: Kicks off the process by fetching 
 * custom questions dynamically from the Cloudflare Worker backend.
 */
async function startInterview() {
    // Read selections dynamically from your existing HTML UI controls
    const roleInput = document.getElementById("job-role") || document.getElementById("role");
    const difficultyInput = document.getElementById("difficulty");
    const countInput = document.getElementById("question-count") || { value: 5 };

    const role = roleInput ? roleInput.value.trim() : "Software Engineer";
    const difficulty = difficultyInput ? difficultyInput.value : "intermediate";
    const count = countInput ? parseInt(countInput.value, 10) : 5;

    // Trigger existing UI transitions / loading animations
    showLoadingState(true);

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "generate_interview",
                role: role,
                difficulty: difficulty,
                count: count
            })
        });

        if (!response.ok) {
            throw new Error(`Worker returned error status: ${response.status}`);
        }

        const result = await response.json();

        // Requirement: Explicitly read result.questions directly from the core payload
        if (!result.questions || !Array.isArray(result.questions)) {
            throw new Error("Invalid response format received from AI Worker.");
        }

        // Initialize session parameters in global memory
        currentQuestions = result.questions;
        currentQuestionIndex = 0;
        userAnswers = [];

        // Hide loading state and display first question using existing UI layout mechanisms
        showLoadingState(false);
        switchToInterviewScreen();
        displayQuestion();

    } catch (error) {
        showLoadingState(false);
        alert(`Failed to start interview: ${error.message}`);
        console.error("Initialization Error:", error);
    }
}

/**
 * Renders the active in-memory question down into the existing DOM text container slots.
 */
function displayQuestion() {
    if (currentQuestions.length === 0) return;

    const currentData = currentQuestions[currentQuestionIndex];
    
    // Wire context into your existing HTML layout element IDs
    const questionTextEl = document.getElementById("question-text");
    const questionNumEl = document.getElementById("question-number");
    const categoryEl = document.getElementById("question-category");
    const answerInputEl = document.getElementById("answer-input") || document.getElementById("candidate-answer");

    if (questionTextEl) questionTextEl.innerText = currentData.question;
    if (questionNumEl) questionNumEl.innerText = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
    if (categoryEl) categoryEl.innerText = currentData.category || "General";
    
    // Flush response input placeholder text box for the incoming question step
    if (answerInputEl) answerInputEl.value = "";
}

/**
 * Dispatches active question context alongside candidate text inputs back to the Worker engine.
 */
async function submitAnswer() {
    const answerInputEl = document.getElementById("answer-input") || document.getElementById("candidate-answer");
    const answerText = answerInputEl ? answerInputEl.value.trim() : "";

    if (!answerText) {
        alert("Please write or provide an answer before submitting.");
        return;
    }

    const currentData = currentQuestions[currentQuestionIndex];
    const roleInput = document.getElementById("job-role") || document.getElementById("role");
    const difficultyInput = document.getElementById("difficulty");

    const role = roleInput ? roleInput.value.trim() : "Software Engineer";
    const difficulty = difficultyInput ? difficultyInput.value : "intermediate";

    showSubmittingState(true);

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "evaluate_answer",
                role: role,
                difficulty: difficulty,
                question: currentData.question,
                answer: answerText
            })
        });

        if (!response.ok) {
            throw new Error(`Evaluation failed with status: ${response.status}`);
        }

        const evaluationResult = await response.json();

        // Append current results directly into session memory
        userAnswers.push({
            question: currentData.question,
            answer: answerText,
            evaluation: evaluationResult // Stores structure containing score, strengths, weaknesses, suggestions
        });

        showSubmittingState(false);
        
        // Progress down the index queue or wrap up session tracking parameters
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            displayQuestion();
        } else {
            navigateToFinalResultsView();
        }

    } catch (error) {
        showSubmittingState(false);
        alert(`Evaluation Connection Error: ${error.message}`);
        console.error("Evaluation pipeline break:", error);
    }
}

// ==========================================
// 3. UI VIEW & DOM LAYER INTERFACES
// ==========================================

/**
 * Controls loader overlay rendering mechanics across runtime executions.
 */
function showLoadingState(isLoading) {
    const loader = document.getElementById("loading-screen") || document.getElementById("loader");
    const setups = document.getElementById("setup-screen") || document.getElementById("setup-container");
    
    if (loader) loader.style.display = isLoading ? "flex" : "none";
    if (setups && isLoading) setups.style.display = "none";
}

/**
 * Simple visibility control tracking intermediate evaluation delays.
 */
function showSubmittingState(isProcessing) {
    const submitBtn = document.getElementById("submit-answer-btn") || document.getElementById("next-btn");
    if (submitBtn) {
        submitBtn.disabled = isProcessing;
        submitBtn.innerText = isProcessing ? "Evaluating..." : "Submit Answer";
    }
}

/**
 * Displays active workspace fields while hiding pre-qualification menus.
 */
function switchToInterviewScreen() {
    const setupScreen = document.getElementById("setup-screen") || document.getElementById("setup-container");
    const interviewScreen = document.getElementById("interview-screen") || document.getElementById("interview-container");

    if (setupScreen) setupScreen.style.display = "none";
    if (interviewScreen) interviewScreen.style.display = "block";
}

/**
 * Aggregates runtime data logs directly into your summary containers.
 */
function navigateToFinalResultsView() {
    const interviewScreen = document.getElementById("interview-screen") || document.getElementById("interview-container");
    const resultsScreen = document.getElementById("results-screen") || document.getElementById("results-container");
    const reportCardsEl = document.getElementById("feedback-report-cards") || document.getElementById("feedback-container");

    if (interviewScreen) interviewScreen.style.display = "none";
    if (resultsScreen) resultsScreen.style.display = "block";

    if (reportCardsEl) {
        reportCardsEl.innerHTML = ""; // Wipe older layout instances safely
        
        let aggregatedScoreSum = 0;

        userAnswers.forEach((record, index) => {
            const score = record.evaluation.score || 0;
            aggregatedScoreSum += score;

            // Dynamically generate markdown-aligned cards using your native styling classes
            const card = document.createElement("div");
            card.className = "feedback-card review-item-block"; 
            card.innerHTML = `
                <h3>Question ${index + 1}: ${record.question}</h3>
                <p><strong>Your Answer:</strong> <em>${record.answer}</em></p>
                <div class="score-badge">Score: <strong>${score}/10</strong></div>
                <p><strong>Strengths:</strong> ${record.evaluation.strengths || "N/A"}</p>
                <p><strong>Weaknesses:</strong> ${record.evaluation.weaknesses || "N/A"}</p>
                <p><strong>Suggestions:</strong> ${record.evaluation.suggestions || "N/A"}</p>
                <p><strong>Model Ideal Answer:</strong> <br><code style="white-space: pre-wrap; display:block; padding:8px; margin-top:5px; background:#f4f4f5; border-radius:4px;">${record.evaluation.modelAnswer || "N/A"}</code></p>
                <hr />
            `;
            reportCardsEl.appendChild(card);
        });

        // Compute average score across items
        const finalAverageScore = userAnswers.length > 0 ? (aggregatedScoreSum / userAnswers.length).toFixed(1) : 0;
        const totalScoreEl = document.getElementById("total-score") || document.getElementById("final-score-display");
        if (totalScoreEl) totalScoreEl.innerText = `${finalAverageScore} / 10`;
    }
}

/**
 * Soft resetting parameters to re-initialize configuration views smoothly.
 */
function resetInterviewSystem() {
    const setupScreen = document.getElementById("setup-screen") || document.getElementById("setup-container");
    const resultsScreen = document.getElementById("results-screen") || document.getElementById("results-container");

    if (resultsScreen) resultsScreen.style.display = "none";
    if (setupScreen) setupScreen.style.display = "block";
    
    currentQuestions = [];
    currentQuestionIndex = 0;
    userAnswers = [];
}
