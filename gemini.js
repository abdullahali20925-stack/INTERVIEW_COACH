const PROXY_URL = "https://inrerviewcoach.abdullahali20925.workers.dev";

// This makes the function globally available for your HTML button's onclick attribute
window.startInterview = async function() {
    // 1. Hook into your HTML elements (checking common ID variations)
    const beginBtn = document.getElementById("begin-btn") || document.getElementById("generate-btn") || document.querySelector("button[onclick*='startInterview']");
    const outputBox = document.getElementById("output-box") || document.getElementById("output-container") || document.getElementById("response-container");

    // 2. Grab inputs from your dropdown select menus or input boxes
    const jobField = document.getElementById("job-field")?.value || document.getElementById("career-field")?.value || "Software Engineering";
    const expLevel = document.getElementById("exp-level")?.value || document.getElementById("experience-level")?.value || "Entry Level";
    const compType = document.getElementById("company-type")?.value || document.getElementById("company")?.value || "Tech Company";

    // Prevent double clicking and show loading status
    if (beginBtn) {
        beginBtn.disabled = true;
        beginBtn.innerText = "Connecting to Coach...";
    }
    if (outputBox) {
        outputBox.innerHTML = "<p style='color: #666;'>Analyzing industry interview standards and generating your custom questions...</p>";
    }

    try {
        // 3. Talk safely to your Cloudflare Worker proxy
        const response = await fetch(PROXY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                field: jobField,
                experience: expLevel,
                company: compType
            })
        });

        if (!response.ok) {
            throw new Error(`Cloudflare returned status code ${response.status}`);
        }

        const result = await response.json();

        // 4. Extract the Groq text content out of the response payload
        const rawText = result.choices[0].message.content;

        // 5. Display the questions cleanly on your page
        if (outputBox) {
            outputBox.innerHTML = `<div class="interview-questions" style="line-height: 1.6; color: #333;">${rawText.replace(/\n/g, "<br>")}</div>`;
        }

    } catch (error) {
        console.error("Interview generation error:", error);
        if (outputBox) {
            outputBox.innerHTML = `<p style="color: #ff4d4d;">Could not load questions. Error details: ${error.message}</p>`;
        }
    } finally {
        // Re-enable the button button
        if (beginBtn) {
            beginBtn.disabled = false;
            beginBtn.innerText = "Begin Interview";
        }
    }
}
