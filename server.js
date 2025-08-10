// server.js
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// In-memory cache for resolved URLs (TTL: 1 hour)
const urlCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Platform patterns for matching URLs
const platformPatterns = [
    { name: "TikTok", pattern: /(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i, displayName: "TikTok" },
    { name: "Douyin", pattern: /(v\.douyin\.com|m\.douyin\.com|douyin\.com)/i, displayName: "Douyin" },
    { name: "Instagram", pattern: /(instagram\.com|instagr\.am)/i, displayName: "Instagram" },
    { name: "Facebook", pattern: /(facebook\.com|fb\.com|fb\.watch|m\.facebook\.com)/i, displayName: "Facebook" },
    { name: "Pinterest", pattern: /(pinterest\.com|pin\.it|pinterest\.ca|pinterest\.co\.uk)/i, displayName: "Pinterest" },
    { name: "SoundCloud", pattern: /(soundcloud\.com|m\.soundcloud\.com)/i, displayName: "SoundCloud" },
    { name: "Capcut", pattern: /(capcut\.com|capcutapp\.com)/i, displayName: "Capcut" },
    { name: "Spotify", pattern: /(spotify\.com|open\.spotify\.com)/i, displayName: "Spotify" },
    { name: "Twitter", pattern: /(x\.com|twitter\.com|t\.co)/i, displayName: "Twitter/X" },
    { name: "YouTube", pattern: /(youtube\.com|youtu\.be|m\.youtube\.com|youtube-nocookie\.com)/i, displayName: "YouTube" },
    { name: "Threads", pattern: /(threads\.net|www\.threads\.com|threads\.com)/i, displayName: "Threads" },
    { name: "ZingMP3", pattern: /(zingmp3\.vn|mp3\.zing\.vn)/i, displayName: "ZingMP3" },
    { name: "Bilibili", pattern: /(bilibili\.com|b23\.tv)/i, displayName: "Bilibili" },
    { name: "Vimeo", pattern: /(vimeo\.com|player\.vimeo\.com)/i, displayName: "Vimeo" },
    { name: "Snapchat", pattern: /(snapchat\.com)/i, displayName: "Snapchat" },
    { name: "Dailymotion", pattern: /(dailymotion\.com|dm\.com)/i, displayName: "Dailymotion" },
    { name: "Sharechat", pattern: /(sharechat\.com)/i, displayName: "Sharechat" },
    { name: "Likee", pattern: /(likee\.video|likeevideo\.com)/i, displayName: "Likee" },
    { name: "LinkedIn", pattern: /(linkedin\.com|lnkd\.in)/i, displayName: "LinkedIn" },
    { name: "Tumblr", pattern: /(tumblr\.com)/i, displayName: "Tumblr" },
    { name: "Telegram", pattern: /(telegram\.org|t\.me)/i, displayName: "Telegram" },
    { name: "GetStickerPack", pattern: /(getstickerpack\.com)/i, displayName: "GetStickerPack" },
    { name: "Bitchute", pattern: /(bitchute\.com)/i, displayName: "Bitchute" },
    { name: "9GAG", pattern: /(9gag\.com)/i, displayName: "9GAG" },
    { name: "OKru", pattern: /(ok\.ru|odnoklassniki\.ru)/i, displayName: "OK.ru" },
    { name: "Rumble", pattern: /(rumble\.com)/i, displayName: "Rumble" },
    { name: "Streamable", pattern: /(streamable\.com)/i, displayName: "Streamable" },
    { name: "Ted", pattern: /(ted\.com)/i, displayName: "Ted" },
    { name: "SohuTv", pattern: /(sohu\.com|tv\.sohu\.com)/i, displayName: "SohuTv" },
    { name: "PornHub", pattern: /(pornhub\.com)/i, displayName: "PornHub" },
    { name: "Xvideos", pattern: /(xvideos\.com)/i, displayName: "Xvideos" },
    { name: "Xnxx", pattern: /(xnxx\.com)/i, displayName: "Xnxx" },
    { name: "Kuaishou", pattern: /(kuaishou\.com|kwai\.com)/i, displayName: "Kuaishou" },
    { name: "Xiaohongshu", pattern: /(xiaohongshu\.com|xhslink\.com)/i, displayName: "Xiaohongshu" },
    { name: "Ixigua", pattern: /(ixigua\.com)/i, displayName: "Ixigua" },
    { name: "Weibo", pattern: /(weibo\.com|weibo\.cn)/i, displayName: "Weibo" },
    { name: "Miaopai", pattern: /(miaopai\.com)/i, displayName: "Miaopai" },
    { name: "Meipai", pattern: /(meipai\.com)/i, displayName: "Meipai" },
    { name: "Xiaoying", pattern: /(xiaoying\.tv)/i, displayName: "Xiaoying" },
    { name: "Yingke", pattern: /(yingke\.cn)/i, displayName: "Yingke" },
    { name: "Sina", pattern: /(sina\.com\.cn)/i, displayName: "Sina" },
    { name: "Bluesky", pattern: /(bluesky\.social|bsky\.app)/i, displayName: "Bluesky" },
    { name: "Mixcloud", pattern: /(mixcloud\.com)/i, displayName: "Mixcloud" },
    { name: "Deezer", pattern: /(deezer\.com)/i, displayName: "Deezer" },
    { name: "Bandcamp", pattern: /(bandcamp\.com)/i, displayName: "Bandcamp" },
    { name: "Castbox", pattern: /(castbox\.fm)/i, displayName: "Castbox" },
    { name: "Mediafire", pattern: /(mediafire\.com)/i, displayName: "Mediafire" },
    { name: "Hipi", pattern: /(hipi\.co\.in)/i, displayName: "Hipi" },
    { name: "ESPN", pattern: /(espn\.com)/i, displayName: "ESPN" },
    { name: "IMDb", pattern: /(imdb\.com)/i, displayName: "IMDb" },
    { name: "Imgur", pattern: /(imgur\.com)/i, displayName: "Imgur" },
    { name: "iFunny", pattern: /(ifunny\.co)/i, displayName: "iFunny" },
    { name: "Izlesene", pattern: /(izlesene\.com)/i, displayName: "Izlesene" },
    { name: "Reddit", pattern: /(reddit\.com|redd\.it)/i, displayName: "Reddit" }
];

// Load API keys from file
const apiKeysFile = './apikeys.json';
let apiKeys = {};
if (fs.existsSync(apiKeysFile)) {
    apiKeys = JSON.parse(fs.readFileSync(apiKeysFile, 'utf8'));
}

// Function to save API keys
function saveApiKeys() {
    fs.writeFileSync(apiKeysFile, JSON.stringify(apiKeys, null, 2));
}

// Function to fetch data from FSMVID API
async function fetchMediaData(url) {
    try {
        // Validate URL
        if (!/^http(s)?:\/\//.test(url)) {
            return { error: true, message: "Invalid URL format" };
        }

        // Find matching platform
        const matchedPlatform = platformPatterns.find(platform => platform.pattern.test(url));
        if (!matchedPlatform) {
            return { error: true, message: "Unsupported platform" };
        }

        // Check cache for resolved URL
        let resolvedUrl = urlCache.get(url);
        if (!resolvedUrl) {
            const resolvedResponse = await axios.get(url, {
                maxRedirects: 10,
                timeout: 8000,
                httpAgent: new (require('http').Agent)({ keepAlive: true, maxSockets: 10 })
            });
            resolvedUrl = resolvedResponse.request.res.responseUrl || url;
            urlCache.set(url, resolvedUrl);
        }

        // Prepare payload and headers for FSMVID API
        const payload = { url: resolvedUrl, platform: matchedPlatform.name.toLowerCase() };
        const headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "Content-Type": "application/json",
            "Origin": "https://fsmvid.com",
            "Referer": "https://fsmvid.com/"
        };

        // Make API request
        const response = await axios.post("https://fsmvid.com/api/proxy", payload, {
            headers,
            timeout: 20000,
            httpAgent: new (require('http').Agent)({ keepAlive: true, maxSockets: 10 })
        });

        const data = response.data;
        return {
            error: false,
            platform: matchedPlatform.displayName,
            data: data,
            resolvedUrl: resolvedUrl
        };
    } catch (error) {
        return {
            error: true,
            message: error.response ? `${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message,
            url: url
        };
    }
}

// Set up Express server
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder

// Rate limiter: 10 requests per 2 minutes per IP
const limiter = rateLimit({
    windowMs: 2 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: true, message: 'Rate limit exceeded: 10 requests per 2 minutes' });
    }
});

// Apply rate limiter to /download
app.use('/download', limiter);

// Endpoint to get API key based on IP
app.get('/get-apikey', (req, res) => {
    const ip = req.ip;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    if (!apiKeys[ip]) {
        apiKeys[ip] = {
            apikey: uuidv4(),
            usage: 0,
            lastMonth: currentMonth
        };
        saveApiKeys();
    }

    let keyInfo = apiKeys[ip];
    if (keyInfo.lastMonth !== currentMonth) {
        keyInfo.usage = 0;
        keyInfo.lastMonth = currentMonth;
        saveApiKeys();
    }

    res.json({ apikey: keyInfo.apikey });
});

// API endpoint to fetch media data
app.get('/download', async (req, res) => {
    const url = req.query.url;
    const apikey = req.query.apikey;

    if (!url) {
        return res.status(400).json({ error: true, message: 'Missing URL parameter' });
    }

    if (!apikey) {
        return res.status(400).json({ error: true, message: 'Missing APIKEY parameter' });
    }

    const ip = req.ip;
    const currentMonth = new Date().toISOString().slice(0, 7);

    if (!apiKeys[ip] || apiKeys[ip].apikey !== apikey) {
        return res.status(401).json({ error: true, message: 'Invalid API key for this IP' });
    }

    let keyInfo = apiKeys[ip];
    if (keyInfo.lastMonth !== currentMonth) {
        keyInfo.usage = 0;
        keyInfo.lastMonth = currentMonth;
    }

    if (keyInfo.usage >= 500) {
        return res.status(429).json({ error: true, message: 'API key usage limit exceeded (500 requests per month). Please use a different network or device to obtain a new API key.' });
    }

    // Increment usage before fetching (to count the request)
    keyInfo.usage++;
    saveApiKeys();

    const result = await fetchMediaData(url);
    if (result.error) {
        // If error, still count the usage, but return error
        return res.status(500).json(result);
    }
    res.json(result);
});

// Serve the main HTML page at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Export fetchMediaData for use in other modules if needed
module.exports = { fetchMediaData };
