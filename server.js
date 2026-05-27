const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Frontend Rule
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Download Handler
app.post('/api/download', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({ error: "Bhai phele YouTube video ka link toh daalo!" });
        }

        // COBALT API - Sabse powerful aur reliable open-source video fetcher infrastructure
        const response = await axios.post('https://cobalt.tools/api/json', {
            url: videoUrl,
            videoQuality: '720',
            downloadMode: 'video', // Direct MP4 request format
            audioFormat: 'mp3'
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        // Agar response sahi aata hai aur url milta hai
        if (response.data && response.data.url) {
            return res.json({
                title: "Your Downloadable Video",
                downloadLink: response.data.url // This is the direct streaming link
            });
        }

        // Fallback Layer - If main production instance is heavily loaded
        const fallbackRes = await axios.post('https://api.cobalt.tools/api/json', {
            url: videoUrl
        }, { 
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            timeout: 10000 
        });

        if (fallbackRes.data && fallbackRes.data.url) {
            return res.json({
                title: "Your Downloadable Video (Backup Server)",
                downloadLink: fallbackRes.data.url
            });
        }

        return res.status(400).json({ error: "Video processing queue full hai. Dusra link try karo bhai!" });

    } catch (error) {
        // Log real issue on render console if something breaks behind the scenes
        console.error("Downloader Error:", error.message);
        return res.status(500).json({ error: "Server heavy load par hai ya API temporarily down hai. Ek baar fir se try karo." });
    }
});

app.listen(PORT, () => console.log(`Stable Downloader Server live on port ${PORT}`));
