const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

async function getAIReflection(currentEntryText, historicalEntries = []) { // Default history to empty array
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Gemini API key not configured in .env file.');
        return "AI reflection service configuration error (API Key missing).";
    }

    try {
        // --- 2. Initialize Gemini Client ---
        const genAI = new GoogleGenerativeAI(apiKey);
        // Select the appropriate model - check Google's documentation for current free/paid options
        // gemini-1.5-flash-latest is often a good balance for speed/capability
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // --- 3. Construct History Section for Prompt ---
        let historySection = "No recent entries (~ last 30 days) available for context.";
        if (historicalEntries.length > 0) {
            historySection = "User's relevant journal history (~ last 30 days, oldest first):\n\n";
            historicalEntries.forEach((entry) => { // Removed index as it wasn't used in the string
                // Check if createdAt exists and format it, provide fallback
                const entryDate = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Unknown Date';
                // Ensure combinedText exists and is a string, provide fallback
                const entryTextContent = entry.combinedText || "";
                historySection += `--- Entry from ${entryDate} ---\n${entryTextContent}\n------\n\n`;
            });
        }

        // --- 4. Construct the Main Prompt ---
        // This includes persona, instructions, history, current entry, rules, and resources
        const prompt = `You are Eremos, an AI journaling assistant acting as a warm, professional, empathetic psychologist/therapist/counselor. Your goal is to provide a thoughtful and nuanced reflection on the user's current journal entry, using history gently for context or identifying significant, recurring patterns. Your goal is to lead them to their "oasis" - Eremos is defined similarly to Jesus being alone in the desert. So many peple are operating alone and are seeking something out there to make life more fulfilling. You are the companion they will walk with through the deserted lands of their mind to find life.

        ${historySection}

        Above is the user's recent journal history. Now, here is the user's *current* journal entry:

        "${currentEntryText}"

        Your tasks are:
        1.  Read the *current* entry carefully, paying attention to stated events, feelings, and nuances.
        2.  Write a reflection on the **current entry** that:
            *   Acknowledges and validates the key experiences, feelings, and observations mentioned *today*. Touch upon several relevant points shared by the user to show you've processed the details.
            *   Summarizes the overall tone or main themes emerging from *today's* entry.
            *   **Use of History (Gentle & Selective):** If you notice a **strong, recurring pattern** (topic/feeling mentioned explicitly 3+ times in history *and* also present today), you may *gently* reference this recurrence (e.g., "It sounds like [topic] continues to be significant..." or "I notice the feeling of [emotion] came up again today..."). Otherwise, keep the focus primarily on the present entry's content. **Do not dwell on history unless it strongly illuminates the present.**
            *   Maintain a supportive, professional, and warm tone.
        3.  **Strictly Avoid Advice:** **DO NOT** give behavioral advice, suggestions, commands, or tell the user what they should do or try. Your role is reflection and posing questions.
            *   **EXCEPTION:** If the *current entry* contains clear language indicating significant distress, hopelessness, self-harm, or immediate safety concerns, keep the reflection brief and *strongly* point towards seeking professional help using the provided resources. Example: "Hearing the depth of your distress today is concerning. Please know support is available. Reaching out to one of the resources below or a trusted professional is crucial."
        4.  Ask **two or three** open-ended reflective questions directly related to the different aspects discussed in the current entry, encouraging deeper self-exploration.
        5.  Add the static resource information, separated by markers, *after* your reflection and questions.

        --- Resources ---
        If exploring themes like stress management, burnout prevention, work-life balance, or finding professional support could be helpful, consider these resources:
        *   National Alliance on Mental Illness (NAMI): https://www.nami.org
        *   Psychology Today Therapist Finder: https://www.psychologytoday.com/us/therapists
        *   Anxiety & Depression Association of America (ADAA): https://adaa.org
        --- End Resources ---

        Generate the response as plain text. Do not use markdown formatting. Ensure the reflection feels comprehensive yet focused on today's entry.`;


        // --- 5. Configure Generation & Safety (Optional but Recommended) ---
         const generationConfig = {
             temperature: 0.7, // Controls randomness. Lower for more predictable, higher for creative.
             // maxOutputTokens: 2048, // Example: Limit response length if needed
         };

         const safetySettings = [
             // Adjust thresholds based on your app's tolerance. BLOCK_MEDIUM_AND_ABOVE is a reasonable start.
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        // --- 6. Call the Gemini API ---
        const result = await model.generateContent(
            prompt,
            // generationConfig, // Uncomment to use specific generation config
            // safetySettings    // Uncomment to apply safety settings
        );

        // --- 7. Process the Response ---
        const response = result.response; // Standard way to get response object

        // Check for safety blocks or other non-STOP finish reasons
        const finishReason = response?.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
             console.warn(`Gemini generation finished with reason: ${finishReason}. Potential safety block or other issue.`);
             // Return a user-friendly message indicating potential blocking
             return `AI reflection generation stopped (Reason: ${finishReason}). This might be due to safety filters. Please review your entry or contact support if needed.`;
        }

        // Extract the text content safely
        const reflectionText = response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reflectionText) {
            return reflectionText.trim(); // Return the successful reflection
        } else {
            // If text extraction fails for some reason
            console.error('Invalid or unexpected response structure from Gemini:', JSON.stringify(response, null, 2));
            return "Error: Could not parse the reflection from the AI service.";
        }

    } catch (error) {
        // --- 8. Handle API Errors ---
        console.error('Error calling Gemini API:', error);
        // Provide more specific feedback if possible
        if (error.message && error.message.includes('API key not valid')) {
             return "AI reflection service error: Invalid API Key.";
        } else if (error.message && error.message.includes('quota')) {
            return "AI reflection service error: Usage limit reached. Please try again later.";
        }
        // Generic error for other issues
        return "Sorry, an unexpected error occurred while generating the reflection.";
    }
}

// --- 9. Export the function ---
module.exports = {
    getAIReflection
};