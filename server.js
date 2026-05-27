// NEW CRASH-PROOF INDRA LOGIC
async function handleIndraRequest(userPrompt, specificAI = null) {
    if (specificAI) {
        return await fetchSingleAI(specificAI, userPrompt);
    }

    console.log("Indra is analyzing the core networks...");
    const activeModels = ['chatgpt', 'claude', 'gemini', 'deepseek', 'perplexity', 'grok'];
    
    // Promise.all ko hata kar humne safe mapper lagaya hai
    const promises = activeModels.map(async (model) => {
        try {
            let res = await fetchSingleAI(model, userPrompt);
            // Agar kisi model ne internally error diya toh use filter karenge
            if (res.answer.includes("responded with an error") || res.answer.includes("timed out")) {
                return { model, answer: null };
            }
            return { model, answer: res.answer };
        } catch (e) {
            return { model, answer: null };
        }
    });

    const results = await Promise.all(promises);

    let answersSheet = {};
    let validModels = [];

    results.forEach(item => {
        if (item.answer !== null) {
            answersSheet[item.model] = item.answer;
            validModels.push(item.model);
        }
    });

    // Agar saare hi models fail ho gaye tabhi final error aayega
    if (validModels.length === 0) {
        return {
            answer: "Bhai, lagta hai aapki saari API keys mein balance khatam hai ya galat hain. Ek baar Render par keys check karo!",
            source: "System Error"
        };
    }

    // Indra sirf unhi models mein se chunega jo sahi chal rahe hain!
    const bestAIModel = await indraBrainEvaluation(userPrompt, answersSheet, validModels);

    return {
        answer: answersSheet[bestAIModel],
        source: `By ${bestAIModel.toUpperCase()}`
    };
}

// Updated Evaluation Layer to handle dynamic valid models
async function indraBrainEvaluation(originalPrompt, answersSheet, validModels) {
    const evaluationPrompt = `You are INDRA. Analyze these responses for the prompt "${originalPrompt}" and return ONLY the winner name key from this exact list: [${validModels.join(', ')}]. Responses: ${JSON.stringify(answersSheet)}`;
    try {
        const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_KEY}`);
        const winner = res.data.candidates[0].content.parts[0].text.trim().toLowerCase();
        return validModels.includes(winner) ? winner : validModels[0];
    } catch (e) {
        return validModels[0]; // Fallback to first working model
    }
}


