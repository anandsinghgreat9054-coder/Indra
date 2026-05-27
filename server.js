const express = require('express');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Download Endpoint
app.post('/api/download', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({ error: "Bhai pehle link toh daalo!" });
        }

        // Validate YouTube URL
        const isValid = ytdl.validateURL(videoUrl);
        if (!isValid) {
            return res.status(400).json({ error: "YouTube ka link galat hai bhai. Sahi URL dalo." });
        }

        // Fetch video details directly from YouTube
        const info = await ytdl.getInfo(videoUrl);
        
        // Find best format that has both audio and video together
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo', filter: 'audioandvideo' });

        if (format && format.url) {
            return res.json({
                title: info.videoDetails.title || "YouTube Video",
                downloadLink: format.url
            });
        } else {
            return res.status(400).json({ error: "Direct stream link nahi mil paya. Koi dusra video try karo." });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "YouTube server se connect nahi ho pa raha hai ya link restricted hai." });
    }
});

app.listen(PORT, () => console.log(`Local Downloader Running on ${PORT}`));
