const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Frontend file serve karega
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Download API Route
app.post('/api/download', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({ error: "Bhai URL toh daalo!" });
        }

        // Public Free Youtube Fetcher API (No Key Needed)
        const apiUrl = `https://api.violetics.pw/api/downloader/youtube?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });

        if (response.data && response.data.result) {
            const data = response.data.result;
            return res.json({
                title: data.title || "YouTube Video",
                thumbnail: data.thumbnail || "",
                downloadLink: data.url || data.videoUrl || data.mp4 // Direct download file URL
            });
        } else {
            // Backup Fallback API if first one is busy
            const fallbackUrl = `https://api.sandipbaruwal.com.np/ytdl?url=${encodeURIComponent(videoUrl)}`;
            const fallbackRes = await axios.get(fallbackUrl);
            
            if(fallbackRes.data && fallbackRes.data.video) {
                return res.json({
                    title: "YouTube Video",
                    thumbnail: "",
                    downloadLink: fallbackRes.data.video
                });
            }
            
            return res.status(400).json({ error: "Video fetch nahi ho payi. Link check karo ya thodi der baad try karo." });
        }

    } catch (error) {
        return res.status(500).json({ error: "Server down hai ya API respond nahi kar rahi." });
    }
});

app.listen(PORT, () => console.log(`YT Downloader live on port ${PORT}`));
