// app/services/aiService.js (Replace existing function content with this)

// Require the Google Generative AI SDK
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Define the function to get the AI reflection
async function getAIReflection(currentEntryText, historicalEntries = []) { // Default history to empty array
    // --- 1. Get API Key ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Gemini API key not configured in .env file.');
        // Return a specific error message the route can handle or show user
        return "AI reflection service configuration error (API Key missing).";
    }

    try {
        // --- 2. Initialize Gemini Client ---
        const genAI = new GoogleGenerativeAI(apiKey);
        // Select the appropriate model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // --- 3. Construct History Section for Prompt ---
        let historySection = "No recent entries (~ last 30 days) available for context.";
        if (historicalEntries && historicalEntries.length > 0) { // Added check for historicalEntries existence
            historySection = "User's relevant journal history (~ last 30 days, oldest first):\n\n";
            historicalEntries.forEach((entry) => {
                const entryDate = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Unknown Date';
                const entryTextContent = entry.combinedText || ""; // Use combinedText from routes.js mapping
                historySection += `--- Entry from ${entryDate} ---\n${entryTextContent}\n------\n\n`;
            });
        }

        // --- 4. Construct the Main Prompt ---
        // Ensure backticks are clean and variable interpolations are correct
        const prompt = `You are Eremos, an AI journaling assistant. Act like a warm, understanding, and insightful peer or mentor who is professionally informed but speaks naturally. Your goal is to offer a supportive reflection that feels validating and provides gentle food for thought, acting as a companion guiding the user toward their inner 'oasis' or place of clarity, much like navigating a mental desert to find life.

${historySection}

Above is the user's recent journal history (~ last 30 days). Now, here is the user's *current* journal entry:

"${currentEntryText}"

Your tasks are:
1.  Read the *current* entry carefully, noticing the feelings, events, and specific details shared.
2.  Write a reflection on the **current entry** (approx. 4-6 sentences) that:
    *   Warmly acknowledges the key experiences or feelings mentioned *today*. Use clear, accessible language – avoid clinical jargon or overly complex words.
    *   Briefly validates the user's perspective or feelings about the events described.
    *   **Use of History (Subtle):** If a theme from today strongly echoes something mentioned 3+ times recently, you can *briefly* nod to it (e.g., "Sounds like [topic] is still on your mind," or "That feeling of [emotion] seems familiar from recent entries."). Keep the focus clearly on *today*.
    *   Maintain a tone that is supportive, empathetic, and maybe even a little encouraging.
3.  **Strictly Avoid Advice:** **DO NOT** give behavioral advice or tell the user what to do.
4.  Ask **one or two** relevant, open-ended questions that naturally follow your reflection on today's entry, prompting gentle self-discovery.
5.  **Resource Guidelines (IMPORTANT):**
    *   **Default:** DO NOT include any resources by default.
    *   **Trigger A (Mental Health Concern):** ONLY if the *current entry* contains clear language about significant mental distress (hopelessness, self-harm, seeking therapy, intense negative self-talk, etc.), THEN append the following standard resources section after your questions:
        --- Resources ---
        If you're going through a particularly tough time, reaching out can make a difference. Consider these options:
        *   988 Suicide & Crisis Lifeline: Call or text 988 (US & Canada)
        *   National Alliance on Mental Illness (NAMI): nami.org
        *   Psychology Today Therapist Finder: psychologytoday.com/us/therapists
        --- End Resources ---
    *   **Trigger B (Interest/Connection/Wellbeing Mention):** If the *current entry* mentions specific interests (e.g., art, books, coding, music, nature, hobbies), challenges related to connection/loneliness, or goals related to physical wellbeing (e.g., fitness, specific activities), AND Trigger A is NOT met, THEN you MAY suggest *one* relevant resource *type* (not the standard list). Phrase it as a gentle possibility related to their entry. Examples:
        *   If coding mentioned: "...Maybe exploring local coding meetups (like searching 'tech meetups [user's city if known, otherwise 'your area']') could be interesting?"
        *   If art/books mentioned: "...Sometimes visiting the local library or art museum website can spark new ideas or connections related to that interest."
        *   If loneliness mentioned: "...Connecting with others who share your interests, perhaps through online groups or local clubs, is something many find helpful."
        *   If fitness goal mentioned: "...Finding a supportive community, maybe an online forum or local group related to [activity], can sometimes help with motivation."
    *   **Priority:** Trigger A (Mental Health Concern) takes priority. If A is met, only show the standard mental health resources. Do not add Trigger B suggestions if Trigger A resources are shown.
    *   **Format:** If adding resources (A or B), place them after the questions. Use markers only if showing the standard list (Trigger A). For Trigger B suggestions, weave it more naturally into the text or add it as a final sentence without markers.

Generate the response as plain text. Do not use markdown formatting. Focus on warmth, clarity, and relevance.`;


        // --- 5. Configure Generation & Safety ---
         const generationConfig = {
             temperature: 0.75,
         };
         const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        // --- 6. Call the Gemini API ---
        console.log("Sending request to Gemini API...");
        const result = await model.generateContent(
            [prompt], // Pass prompt as array for some models/versions
            generationConfig,
            safetySettings
        );
        console.log("Received response from Gemini API.");

        // --- 7. Process the Response ---
        // Note: Accessing response might differ slightly based on SDK version nuances when sending prompt as array
        const response = result.response;
        const finishReason = response?.candidates?.[0]?.finishReason;

        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
             console.warn(`Gemini generation finished with reason: ${finishReason}.`);
             return `AI reflection generation stopped (Reason: ${finishReason}).`;
        }

        const rawReflectionText = response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawReflectionText) {
            console.log("Successfully extracted reflection text.");
            return rawReflectionText.trim();
        } else {
            console.error('Invalid response structure:', JSON.stringify(response, null, 2));
            return "Error: Could not parse the reflection from the AI service.";
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