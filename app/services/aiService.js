// app/services/aiService.js

// Require the Google Generative AI SDK
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Define the function to get the AI reflection
async function getAIReflection(currentEntryText, historicalEntries = []) { // Default history to empty array
    // --- 1. Get API Key ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Gemini API key not configured in .env file.');
        return "AI reflection service configuration error (API Key missing).";
    }

    try {
        // --- 2. Initialize Gemini Client ---
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Or a more powerful model if needed

        // --- 3. Construct History Section for Prompt ---
        let historySection = "No recent entries (~ last 30 days) available for context.";
        if (historicalEntries && historicalEntries.length > 0) {
            historySection = "For context, here is some of the user's relevant journal history from the last ~30 days (oldest first):\n\n";
            historicalEntries.forEach((entry) => {
                const entryDate = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Unknown Date';
                // Use combinedText field which should be mapped in routes.js
                const entryTextContent = entry.combinedText || "";
                // Basic escaping for prompt safety
                const safeEntryTextContent = entryTextContent.replace(/`/g, "'").replace(/\${/g, "\\${");
                historySection += `--- Entry from ${entryDate} ---\n${safeEntryTextContent}\n------\n\n`;
            });
            historySection += "--- End of History Context ---";
        }

        // --- 4. Construct the Main Prompt (Refined Length Guidance) ---
        // Basic escaping for prompt safety
        const safeCurrentEntryText = currentEntryText.replace(/`/g, "'").replace(/\${/g, "\\${");

        const prompt = `You are Eremos, an AI journaling assistant simulating the role of a professional, empathetic, and insightful psychologist or therapist. Your primary goal is to help the user gain self-awareness and clarity by reflecting deeply on their written thoughts and feelings. Maintain a warm, professional, non-judgmental, and validating tone throughout. Use natural, accessible language but demonstrate psychological insight.

        **Core Therapeutic Stance:**
        *   **Empathy & Validation:** Show genuine understanding and validation of the user's stated experiences and emotions. Make them feel heard.
        *   **Reflection & Interpretation:** Gently reflect back the core themes, feelings, or patterns you observe. Offer tentative interpretations or highlight potential connections when appropriate and supported by the text.
        *   **Facilitate Self-Discovery:** Ask thoughtful, open-ended questions *only when* they naturally arise from the reflection and encourage deeper exploration.
        *   **Non-Directive:** **DO NOT give advice, solutions, or tell the user what they *should* do.** Empower them to find their own way.
        *   **Flexibility & Depth:** Adapt your response based on the user's entry. For entries with emotional substance or detail, aim for a thoughtful, more comprehensive reflection (perhaps around 6-10 meaningful sentences total, including questions if asked). For very short or purely factual entries lacking emotional depth, a shorter acknowledgment (1-3 sentences) is appropriate. **Prioritize meaningful content over hitting an exact sentence count.**

        **History Context:**
        ${historySection}

        **User's Current Journal Entry:**
        "${safeCurrentEntryText}"

        **Your Response Task:**
        Based *primarily* on the user's **current entry**, craft a reflective response:

        1.  **Opening:** Begin with a warm, empathetic acknowledgment (1-2 sentences) that directly addresses the core of what the user shared today. Validate their feelings or experience.
        2.  **Body (Reflection & Insight):** Develop the reflection further, exploring the main themes or feelings expressed *if the entry warrants it*. Offer gentle observations or tentative interpretations based on the entry. Use history subtly *only* if it strongly clarifies today's point (e.g., "That feeling of [X] seems persistent lately..."). If the user expressed significant difficulty, ensure this section provides thorough validation and depth.
        3.  **Questions (Optional):** If the entry and your reflection naturally lead to it, pose **one, perhaps two**, open-ended questions that invite deeper exploration. **Do not force questions** if the entry doesn't warrant them.
        4.  **Resources (Conditional - Apply ONLY ONE rule, if any):**
            *   **Crisis Trigger:** If the entry contains clear, explicit language indicating **imminent crisis, hopelessness suggesting suicidal ideation, or self-harm**, your *primary* response must be **brief and direct**, expressing concern and immediately pointing to the standard mental health resources, clearly marked. Prioritize safety over reflective length. Example: "Reading this entry raises serious concerns for your safety and well-being. Please know that immediate support is available. Connecting with one of these resources right now is incredibly important:\\n--- Resources ---\\n[List: 988, NAMI, Finder]\\n--- End Resources ---"
            *   **Significant Distress Trigger (Non-Crisis):** If the entry expresses significant but non-imminent distress *without* crisis language, *after* your main reflection and questions, you MAY add the standard mental health resources, framed gently. Example: "...Exploring these feelings further might be helpful... professional support is available...\\n--- Resources ---\\n[List: NAMI, Finder]\\n--- End Resources ---"
            *   **Exploration Trigger (Rarely):** If the entry explores specific interests/goals/connection needs *and* neither distress trigger is met, you *might* gently weave in **one sentence** suggesting a *type* of resource for exploration (not advice). Example: "...Exploring creative outlets... local art centers..." Use sparingly.
            *   **Default:** No resources.

        **Final Check:** Ensure your response sounds like a thoughtful, professional reflection tailored to *this specific entry*. Use varied sentence structures. Generate plain text only. Do not use markdown formatting.`;


        // --- 5. Configure Generation & Safety ---
         const generationConfig = {
             temperature: 0.7, // Balanced temperature
         };
         const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        // --- 6. Call the Gemini API ---
        console.log("Sending request to Gemini API with refined length prompt..."); // Log message updated
        const result = await model.generateContent(
            [prompt],
            generationConfig,
            safetySettings
        );
        console.log("Received response from Gemini API.");

        // --- 7. Process the Response ---
        const response = result.response;
        const finishReason = response?.candidates?.[0]?.finishReason;

        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
             console.warn(`Gemini generation finished with reason: ${finishReason}.`);
             if (finishReason === 'SAFETY') {
                 return "AI reflection could not be generated due to safety content filters. Please review your entry or contact support.";
             }
             return `AI reflection generation stopped unexpectedly (Reason: ${finishReason}).`;
        }

        const rawReflectionText = response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawReflectionText) {
            console.log("Successfully extracted reflection text.");
            return rawReflectionText.trim();
        } else {
            console.error('Invalid response structure - missing text:', JSON.stringify(response, null, 2));
            return "Error: Could not parse the reflection text from the AI service.";
        }

    } catch (error) {
        // --- 8. Handle API Errors ---
        console.error('Error calling Gemini API:', error);
        if (error.message && error.message.includes('API key not valid')) {
             return "AI reflection service error: Invalid API Key.";
        } else if (error.message && (error.message.includes('quota') || (error.response && error.response.status === 429))) {
            console.warn("Gemini API quota likely exceeded.");
            return "AI reflection service error: Usage limit reached.";
        }
        return "Sorry, an unexpected error occurred while generating the reflection.";
    }
}

// --- 9. Export the function ---
module.exports = {
    getAIReflection
};