// Connects directly to your new secure Cloudflare Worker proxy
const PROXY_URL = "https://inrerviewcoach.abdullahali20925.workers.dev";

// Wait for the HTML page to fully load before listening for button clicks
document.addEventListener("DOMContentLoaded", () => {
    const generateBtn = document.getElementById("generate-btn"); // Make sure your button has id="generate-btn"
    const outputContainer = document.getElementById("output-container"); // Make sure your output box has id="output-container"

    if (!generateBtn) {
        console.error("Error: Could not find a button with id='generate-btn' in your HTML.");
        return;
    }

    generateBtn.addEventListener("click", async () => {
        // 1. Collect user inputs from your HTML form fields
        const careerField = document.getElementById("career-field")?.value || "General";
        const experienceLevel = document.getElementById("experience-level")?.value || "Entry Level";
        const companyType = document.getElementById("company-type")?.value || "Standard";

        // Update UI to show it is loading
        generateBtn.disabled = true;
        generateBtn.innerText = "Generating Questions...";
        if (outputContainer) outputContainer.innerHTML = "<p>Loading your AI interview questions...</p>";

        try {
            // 2. Send the user choices safely to your Cloudflare Worker
            const response = await fetch(PROXY_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    field: careerField,
                    experience: experienceLevel,
                    company: companyType
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with error status: ${response.status}`);
            }

            const data = await response.json();

            // 3. Extract Groq's text response content safely
            const aiTextResponse = data.choices[0].message.content;

            // 4. Display the results nicely inside your HTML output container
            if (outputContainer) {
                // If the response text contains markdown-style line breaks, clean them up for HTML display
                outputContainer.innerHTML = `
                    <div class="ai-response">
                        ${aiTextResponse.replace(/\n/g, "<br>")}
                    </div>
                `;
            }

        } catch (error) {
            console.error("Error generating questions:", error);
            if (outputContainer) {
                outputContainer.innerHTML = `<p style="color: red;">Failed to generate questions. Error: ${error.message}</p>`;
            }
        } finally {
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.innerText = "Generate Questions";
        }
    });
});
