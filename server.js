const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, specificAI } = req.body;
        
        // Single Model Mode
        if (specificAI) {
            const reply = await fetchSingleAI(specificAI, prompt);
            return res.json({ answer: reply, source: `By ${specificAI.toUpperCase()}` });
        }

        // Indra Mode: Jo sabse pehle chal jaye (Fastest Winner)
        const activeModels = ['chatgpt', 'claude', 'gemini', 'deepseek'];
        const promises = activeModels.map(async (model) => {
            const ans = await fetchSingleAI(model, prompt);
            if (ans && !ans.includes("error")) return { model, ans };
            throw new Error();
        });

        // Jo pehla model sahi jawab dega, use utha lo
        const winner = await Promise.any(promises);
        res.json({ answer: winner.ans, source: `By ${winner.model.toUpperCase()}` });

    } catch (error) {
        res.json({ answer: "Bhai, ya toh saari keys ka balance khatam hai ya URL block hai. Ek baar specific model select karke check karo.", source: "System" });
    }
});

async function fetchSingleAI(modelName, prompt) {
    try {
        if (modelName === 'chatgpt') {
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o', messages: [{ role: 'user', content: prompt }]
            }, { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` } });
            return res.data.choices[0].message.content;
        }
        if (modelName === 'gemini') {
            const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_KEY}`, {
                contents: [{ parts: [{ text: prompt }] }]
            });
            return res.data.candidates[0].content.parts[0].text;
        }
        if (modelName === 'claude') return await callOpenRouter('anthropic/claude-3.5-sonnet', prompt);
        if (modelName === 'deepseek') return await callOpenRouter('deepseek/deepseek-chat', prompt);
    } catch (e) {
        return "error";
    }
}

async function callOpenRouter(modelId, prompt) {
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: modelId, messages: [{ role: 'user', content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}` } });
    return res.data.choices[0].message.content;
}

app.listen(PORT, () => console.log(`Server live on ${PORT}`));



