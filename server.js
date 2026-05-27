const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API Keys from Render Environment Variables
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Serve Front-end
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Central Route
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, specificAI } = req.body;

        // 1. Target Mode (Dropdown handling)
        if (specificAI && specificAI !== "") {
            const reply = await fetchSingleAI(specificAI, prompt);
            if (reply === "error" || !reply) {
                return res.json({ 
                    answer: `Bhai, ${specificAI.toUpperCase()} ne response nahi diya. Ho sakta hai iska balance khatam ho ya API Key sahi na ho.`, 
                    source: "System Error" 
                });
            }
            return res.json({ answer: reply, source: `By ${specificAI.toUpperCase()}` });
        }

        // 2. Indra Mode (Auto Best / Parallel Fallback)
        const activeModels = ['chatgpt', 'claude', 'gemini', 'deepseek'];
        const promises = activeModels.map(async (model) => {
            const ans = await fetchSingleAI(model, prompt);
            return { model, ans };
        });

        const responses = await Promise.all(promises);
        
        // Filter out failed responses
        const validResponses = responses.filter(r => r.ans && r.ans !== "error");

        if (validResponses.length === 0) {
            return res.json({ 
                answer: "Bhai, piche se saare AI models ne error de diya hai. Ek baar Render par check karo ki teeno Keys sahi hain aur unme balance available hai ya nahi.", 
                source: "System Error" 
            });
        }

        // Indra takes the first successful fast response smoothly
        const winner = validResponses[0];
        return res.json({ answer: winner.ans, source: `By ${winner.model.toUpperCase()}` });

    } catch (error) {
        return res.json({ answer: "Indra ke system mein koi internal server error aaya hai.", source: "System Error" });
    }
});

// Universal AI Fetcher Core
async function fetchSingleAI(modelName, prompt) {
    try {
        if (modelName === 'chatgpt') {
            if (!OPENAI_KEY) return "error";
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }]
            }, { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` }, timeout: 10000 });
            return res.data.choices[0].message.content;
        }

        if (modelName === 'gemini') {
            if (!GOOGLE_KEY) return "error";
            const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_KEY}`, {
                contents: [{ parts: [{ text: prompt }] }]
            }, { timeout: 10000 });
            return res.data.candidates[0].content.parts[0].text;
        }

        if (modelName === 'claude') return await callOpenRouter('anthropic/claude-3.5-sonnet', prompt);
        if (modelName === 'deepseek') return await callOpenRouter('deepseek/deepseek-chat', prompt);
        if (modelName === 'perplexity') return await callOpenRouter('perplexity/sonar-reasoning', prompt);
        if (modelName === 'grok') return await callOpenRouter('xai/grok-beta', prompt);

        return "error";
    } catch (e) {
        return "error";
    }
}

// OpenRouter Call Bridge
async function callOpenRouter(modelId, prompt) {
    try {
        if (!OPENROUTER_KEY) return "error";
        const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: modelId,
            messages: [{ role: 'user', content: prompt }]
        }, { headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}` }, timeout: 10000 });
        return res.data.choices[0].message.content;
    } catch (e) {
        return "error";
    }
}

app.listen(PORT, () => console.log(`Indra Server running stable on port ${PORT}`));




