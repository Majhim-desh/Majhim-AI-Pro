// 3. Voice & Utility Logic (The Bulletproof Version)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let currentAudio = null;
let speechQueue = [];
let queueIndex = 0;
let isSpeaking = false; // 🔥 The Ultimate Gatekeeper

function playNextChunk() {
    if (queueIndex >= speechQueue.length) {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "none";
        isSpeaking = false; // बोलना खत्म, लॉक खोलें
        return;
    }

    let chunk = speechQueue[queueIndex].trim();
    if (!chunk) {
        queueIndex++;
        playNextChunk();
        return;
    }

    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=hi&client=tw-ob`;

    currentAudio = new Audio(voiceUrl);
    currentAudio.preload = "auto"; // 🚀 Bonus: Fast Loading

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Majhim AI Pro बोल रहा है...',
            artist: 'Majhim Desh'
        });
        navigator.mediaSession.playbackState = "playing";
    }

    currentAudio.onended = () => {
        queueIndex++;
        playNextChunk();
    };

    currentAudio.onerror = () => {
        queueIndex++;
        playNextChunk();
    };

    currentAudio.play().catch(() => {
        queueIndex++;
        playNextChunk();
    });
}

function speakText(text) {
    // 🔥 Guard Logic: अगर पहले से बोल रहा है, तो पहले पूरी तरह सफ़ाई करें
    if (isSpeaking) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
        window.speechSynthesis.cancel();
    }

    // Reset everything for the new request
    speechQueue = [];
    queueIndex = 0;

    let cleanText = text.replace(/```[\s\S]*?```/g, "").trim();
    if (!cleanText) {
        isSpeaking = false;
        return;
    }

    speechQueue = cleanText.split(/(?<=[।!?])\s+/).filter(s => s.trim().length > 0);
    if (speechQueue.length === 0) speechQueue = [cleanText];

    isSpeaking = true; // Lock it!
    playNextChunk();
}

function speakFromBubble(btn) {
    // 🔥 Double-click block: जब बोल रहा हो, तो नया ट्रिगर न हो
    if (isSpeaking) return; 

    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    speakText(text);
}

// --- Standard Utilities (Mic & Copy) ---
function startVoiceTyping() {
    if (!recognition) { alert("Voice typing not supported."); return; }
    recognition.lang = 'hi-IN';
    recognition.start();
    document.getElementById('mic-btn').style.background = "#ea0038";
    recognition.onresult = (event) => {
        userInput.value += event.results[0][0].transcript;
    };
    recognition.onspeechend = () => {
        recognition.stop();
        document.getElementById('mic-btn').style.background = "#3b4a54";
    };
    recognition.onerror = () => { document.getElementById('mic-btn').style.background = "#3b4a54"; };
}

function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText; btn.innerText = "COPIED ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}
