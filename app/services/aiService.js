// app/services/aiService.js

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const resources = require("../../config/resources.js");

const MODEL_NAME = "gemini-2.5-flash";
const generationConfig = { temperature: 0.7 };
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function escapeForPrompt(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/`/g, "'").replace(/\${/g, "\\${");
}

/**
 * Step 1: Relevance check. Asks the model which resource categories (if any) are relevant to this entry.
 * Returns an array of category keys, e.g. ["crisis"] or ["loneliness", "wellbeing"] or [].
 */
async function getRelevantResourceCategories(currentEntryText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return [];

    const safeText = escapeForPrompt(currentEntryText.slice(0, 3000));
    const compactList = resources.getCompactList();

    const prompt = `You are a relevance classifier. Given a short journal entry and a list of resource categories, output which categories (if any) are relevant to the entry.

Resource categories (use these exact keys in your response):
${compactList}

Journal entry:
"${safeText}"

Reply with ONLY a comma-separated list of category keys that apply (e.g. crisis, loneliness, wellbeing), or the single word "none" if none apply. Use lowercase. No other text.`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent([prompt], generationConfig, safetySettings);
        const raw = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) return [];

        const normalized = raw.trim().toLowerCase().replace(/\./g, '');
        if (normalized === 'none' || normalized === '') return [];

        const validKeys = Object.keys(resources.categories);
        const keys = normalized.split(/[\s,]+/).filter(k => validKeys.includes(k));
        return [...new Set(keys)];
    } catch (err) {
        console.error('Relevance check error:', err);
        return [];
    }
}

/**
 * Step 2: Reflection. Uses existing empathic prompt and injects only relevant resources from the big list.
 */
async function getAIReflection(currentEntryText, historicalEntries = [], relevantCategoryKeys = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Gemini API key not configured in .env file.');
        return "AI reflection service configuration error (API Key missing).";
    }

    if (relevantCategoryKeys === null) {
        relevantCategoryKeys = await getRelevantResourceCategories(currentEntryText);
    }
    const resourcesBlock = resources.getResourcesTextForCategories(relevantCategoryKeys);
    const relevantLabel = relevantCategoryKeys.length > 0 ? relevantCategoryKeys.join(', ') : 'none';

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        let historySection = "No recent entries (~ last 30 days) available for context.";
        if (historicalEntries && historicalEntries.length > 0) {
            historySection = "For context, here is some of the user's relevant journal history from the last ~30 days (oldest first):\n\n";
            historicalEntries.forEach((entry) => {
                const entryDate = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Unknown Date';
                const entryTextContent = entry.combinedText || "";
                const safeEntryTextContent = escapeForPrompt(entryTextContent);
                historySection += `--- Entry from ${entryDate} ---\n${safeEntryTextContent}\n------\n\n`;
            });
            historySection += "--- End of History Context ---";
        }

        const safeCurrentEntryText = escapeForPrompt(currentEntryText);

        const prompt = `You are Eremos, an AI journaling assistant simulating the role of a professional, empathetic, and insightful psychologist or therapist. Your primary goal is to help the user gain self-awareness and clarity by reflecting deeply on their written thoughts and feelings. Maintain a warm, professional, non-judgmental, and validating tone throughout. Use natural, accessible language but demonstrate psychological insight.

**Core Therapeutic Stance:**
* **Empathy & Validation:** Show genuine understanding and validation of the user's stated experiences and emotions. Make them feel heard.
* **Reflection & Interpretation:** Gently reflect back the core themes, feelings, or patterns you observe. Offer tentative interpretations or highlight potential connections when appropriate and supported by the text.
* **Facilitate Self-Discovery:** Ask thoughtful, open-ended questions *only when* they naturally arise from the reflection and encourage deeper exploration.
* **Non-Directive:** **DO NOT give advice, solutions, or tell the user what they *should* do.** Empower them to find their own way.
* **Flexibility & Depth:** Adapt your response based on the user's entry. For entries with emotional substance or detail, aim for a thoughtful, more comprehensive reflection (perhaps around 6-10 meaningful sentences total, including questions if asked). For very short or purely factual entries lacking emotional depth, a shorter acknowledgment (1-3 sentences) is appropriate. **Prioritize meaningful content over hitting an exact sentence count.**

**History Context:**
${historySection}

**User's Current Journal Entry:**
"${safeCurrentEntryText}"

**Relevant resource categories for this entry (from a separate check):** ${relevantLabel}
${resourcesBlock ? `**Resources to reference if relevant (include a brief, natural pointer only when the categories above are not "none"):**\n${resourcesBlock}\n` : ''}

Your tasks are:
1. Read the *current* entry carefully, noticing the feelings, events, and specific details shared.
2. Write a reflection on the **current entry** (approx. 3-5 sentences) that:
   * Warmly acknowledges the key experiences or feelings mentioned *today*. Use clear, accessible language. Avoid clinical jargon or overly complex words.
   * Briefly validates the user's perspective or feelings about the events described.
   * **Use of History (Subtle):** If a theme from today strongly echoes something mentioned 3+ times recently, you can *briefly* nod to it (e.g., "Sounds like [topic] is still on your mind," or "That feeling of [emotion] seems familiar from recent entries."). Keep the focus clearly on *today*.
   * Maintain a tone that is supportive, empathetic, and maybe even a little encouraging.
3. **Strictly Avoid Advice:** **DO NOT** give behavioral advice or tell the user what to do.
4. Ask **one or two** relevant, open-ended questions that naturally follow your reflection on today's entry, prompting gentle self-discovery.
5. **Resources (IMPORTANT):** If and only if the relevant categories above are not "none", include a brief, natural pointer to the matching resources listed above (e.g. one sentence or a short "If you'd like support..." line). Place it after your questions. If the categories are "none", do NOT include any resources.

**Final Check:** Ensure your response sounds like a thoughtful, professional reflection tailored to *this specific entry*. Use varied sentence structures. Generate plain text only. Do not use markdown formatting.`;

        console.log("Sending reflection request to Gemini API (with resource relevance)...");
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