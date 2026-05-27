const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();

// Render par port dynamic hota hai, isliye process.env.PORT zaroori hai
const PORT = process.env.PORT || 3000;

app.use(express.json());

// HTML aur static files ko serve karne ka sahi rasta
app.use(express.static(path.join(__dirname)));

// API Keys Configuration
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Base Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat Route
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, specificAI } = req.body;
        const result = await handleIndraRequest(prompt, specificAI);
        res.json(result);
    } catch (error) {
        res.status(500).json({ answer: "Indra ke dimaag mein thoda load aa gaya!", source: "System Error" });
    }
});

// Main Core Logic
async function handleIndraRequest(userPrompt, specificAI = null) {
    if (specificAI) {
        return await fetchSingleAI(specificAI, userPrompt);
    }

    console.log("Indra is analyzing the core networks...");
    const activeModels = ['chatgpt', 'claude', 'gemini', 'deepseek', 'perplexity', 'grok'];
    const promises = activeModels.map(model => fetchSingleAI(model, userPrompt));
    const responses = await Promise.all(promises);

    let answersSheet = {};
    activeModels.forEach((model, index) => {
        answersSheet[model] = responses[index].answer;
    });

    const bestAIModel = await indraBrainEvaluation(userPrompt, answersSheet);

    return {
        answer: answersSheet[bestAIModel],
        source: `By ${bestAIModel.toUpperCase()}`
    };
}

// Multi-Provider Fetcher
async function fetchSingleAI(modelName, prompt) {
    try {
        switch (modelName) {
            case 'chatgpt':
                const reqOpenAI = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-4o',
                    messages: [{ role: 'user', content: prompt }]
                }, { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` } });
                return { answer: reqOpenAI.data.choices[0].message.content };

            case 'gemini':
                const reqGoogle = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_KEY}`, {
                    contents: [{ parts: [{ text: prompt }] }]
                });
                return { answer: reqGoogle.data.candidates[0].content.parts[0].text };

            case 'claude': return { answer: await callOpenRouter('anthropic/claude-3.5-sonnet', prompt) };
            case 'deepseek': return { answer: await callOpenRouter('deepseek/deepseek-chat', prompt) };
            case 'perplexity': return { answer: await callOpenRouter('perplexity/sonar-reasoning', prompt) };
            case 'grok': return { answer: await callOpenRouter('xai/grok-beta', prompt) };
            
            default: return { answer: "Model not found." };
        }
    } catch (err) {
        return { answer: `${modelName.toUpperCase()} responded with an error.` };
    }
}

// OpenRouter Call Helper
async function callOpenRouter(modelId, prompt) {
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: modelId,
        messages: [{ role: 'user', content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}` } });
    return res.data.choices[0].message.content;
}

// Indra Brain Decision (Using Gemini Flash)
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

// Server port verification link for Render
app.listen(PORT, () => console.log(`Indra AI is live on port ${PORT}!`));

