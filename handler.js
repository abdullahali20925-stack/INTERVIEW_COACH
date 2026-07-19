const PROXY_URL = "https://inrerviewcoach.abdullahali20925.workers.dev";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Hook into your HTML elements
    const beginBtn = document.getElementById("begin-btn") || document.getElementById("generate-btn");
    const outputBox = document.getElementById("output-box") || document.getElementById("output-container") || document.getElementById("response-container");

    if (!beginBtn) {
        console.error("Could not find your button element. Make sure your button has an id.");
        return;
    }

    beginBtn.addEventListener("click", async () => {
        // 2. Grab inputs from your dropdown select menus or input boxes
        const jobField = document.getElementById("job-field")?.value || document.getElementById("career-field")?.value || "Software Engineering";
        const expLevel = document.getElementById("exp-level")?.value || document.getElementById("experience-level")?.value || "Entry Level";
        const compType = document.getElementById("company-type")?.value || "Tech Company";

        // Update UI to show it's working
        beginBtn.disabled = true;
        beginBtn.innerText = "Connecting to Coach...";
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
                // Formats the response line breaks nicely for your HTML page view
                outputBox.innerHTML = `<div class="interview-questions">${rawText.replace(/\n/g, "<br>")}</div>`;
            }

        } catch (error) {
            console.error("Interview generation error:", error);
            if (outputBox) {
                outputBox.innerHTML = `<p style="color: #ff4d4d;">Could not load questions. Error details: ${error.message}</p>`;
            }
        } finally {
            // Re-enable button
            beginBtn.disabled = false;
            beginBtn.innerText = "Begin Interview";
        }
    });
});
