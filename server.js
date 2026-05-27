// INDRA AI - Multi-Provider Smart Aggregator
const axios = require('axios');

// 1. API Keys Configuration (Environment Variables)
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// 2. Main Controller
async function handleIndraRequest(userPrompt, specificAI = null) {
    
    // Target Mode: Agar user ne dropdown se koi ek AI select kiya hai
    if (specificAI) {
        return await fetchSingleAI(specificAI, userPrompt);
    }

    // "INDRA MODE" (Default): Top 6 models ka parallel analysis shuru
    console.log("Indra is analyzing the core networks...");
    
    const activeModels = ['chatgpt', 'claude', 'gemini', 'deepseek', 'perplexity', 'grok'];
    const promises = activeModels.map(model => fetchSingleAI(model, userPrompt));
    const responses = await Promise.all(promises);

    let answersSheet = {};
    activeModels.forEach((model, index) => {
        answersSheet[model] = responses[index].answer;
    });

    // Indra ka dimaag faisla karega ki sabse best answer kiska hai
    const bestAIModel = await indraBrainEvaluation(userPrompt, answersSheet);

    return {
        answer: answersSheet[bestAIModel],
        source: `By ${bestAIModel.toUpperCase()}`
    };
}

// 3. Router Matrix: Alag-Alag Provider Se Data Khinchne Ke Liye
async function fetchSingleAI(modelName, prompt) {
    try {
        switch (modelName) {
            case 'chatgpt': // Asli OpenAI API
                const reqOpenAI = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-4o',
                    messages: [{ role: 'user', content: prompt }]
                }, { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` } });
                return { answer: reqOpenAI.data.choices[0].message.content };

            case 'gemini': // Asli Google AI Studio API
                const reqGoogle = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_KEY}`, {
                    contents: [{ parts: [{ text: prompt }] }]
                });
                return { answer: reqGoogle.data.candidates[0].content.parts[0].text };

            // Baki saare OpenRouter se chalenge
            case 'claude': return { answer: await callOpenRouter('anthropic/claude-3.5-sonnet', prompt) };
            case 'deepseek': return { answer: await callOpenRouter('deepseek/deepseek-chat', prompt) };
            case 'perplexity': return { answer: await callOpenRouter('perplexity/sonar-reasoning', prompt) };
            case 'grok': return { answer: await callOpenRouter('xai/grok-beta', prompt) };
            
            default: return { answer: "Model not found." };
        }
    } catch (err) {
        return { answer: `${modelName.toUpperCase()} node timed out.` };
    }
}

// 4. OpenRouter Helper
async function callOpenRouter(modelId, prompt) {
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: modelId,
        messages: [{ role: 'user', content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}` } });
    return res.data.choices[0].message.content;
}

// 5. Indra's Judgment Layer (Using Free Gemini Flash on Google API to save cost)
async function indraBrainEvaluation(originalPrompt, answersSheet) {
    const evaluationPrompt = `You are INDRA. Analyze these responses for the prompt "${originalPrompt}" and return ONLY the winner name key from this list: [chatgpt, claude, gemini, deepseek, perplexity, grok]. Responses: ${JSON.stringify(answersSheet)}`;
    try {
        const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_KEY}`, {
            contents: [{ parts: [{ text: evaluationPrompt }] }]
        });
        const winner = res.data.candidates[0].content.parts[0].text.trim().toLowerCase();
        return ['chatgpt', 'claude', 'gemini', 'deepseek', 'perplexity', 'grok'].includes(winner) ? winner : 'chatgpt';
    } catch (e) {
        return 'chatgpt';
    }
}
