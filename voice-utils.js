// 3. Voice & Utility Logic (The Bulletproof Hacker Edition)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let currentAudio = null;
let speechQueue = [];
let queueIndex = 0;
let useFallback = false;
let resumeInterval = null; // 🔥 Battery Saver Switch

// 🛡️ Anti-Kill System Function: MIUI Cleaner से मुकाबला और बैटरी की बचत
function startResumeSystem() {
    if (resumeInterval) clearInterval(resumeInterval);
    resumeInterval = setInterval(() => {
        // चेक करें कि क्या ऑडियो रुका हुआ है जबकि उसे बजना चाहिए
        if (currentAudio && currentAudio.paused && !currentAudio.ended && queueIndex < speechQueue.length) {
            currentAudio.play().catch(() => {
                if(!useFallback) {
                    useFallback = true;
                    playNextChunk();
                }
            });
        }
    }, 1000);
}

function playNextChunk() {
    // 🏁 कतार खत्म -> सिस्टम को सुला दो (CPU & Battery Save)
    if (queueIndex >= speechQueue.length) {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "none";
        if (resumeInterval) {
            clearInterval(resumeInterval); 
            resumeInterval = null;
        }
        return;
    }

    let chunk = speechQueue[queueIndex].trim();
    if (!chunk) {
        queueIndex++;
        playNextChunk();
        return;
    }

    if (useFallback) {
        fallbackSpeak(chunk);
        return;
    }

    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=hi&client=tw-ob`;

    // पुराने ऑडियो की सफाई
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    currentAudio = new Audio(voiceUrl);
    currentAudio.preload = "auto";

    currentAudio.onended = () => {
        queueIndex++;
        playNextChunk();
    };

    currentAudio.onerror = () => {
        useFallback = true;
        fallbackSpeak(chunk);
    };

    // प्ले शुरू होते ही सुरक्षा तंत्र सक्रिय करें
    currentAudio.play().then(() => startResumeSystem()).catch(() => {
        useFallback = true;
        fallbackSpeak(chunk);
    });
}

function fallbackSpeak(text) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';
    utter.onstart = () => startResumeSystem(); // Fallback में भी सुरक्षा जारी रखें
    utter.onend = () => {
        queueIndex++;
        playNextChunk();
    };
    utter.onerror = () => {
        queueIndex++;
        playNextChunk();
    };
    window.speechSynthesis.speak(utter);
}

function speakText(text) {
    // नया बटन दबने पर पुराने को पूरी तरह चुप कराएं
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }
    window.speechSynthesis.cancel();
    
    speechQueue = [];
    queueIndex = 0;
    useFallback = false;

    // कोड ब्लॉक्स को "कोड ब्लॉक" शब्द से बदलें ताकि AI सिंबल न चिल्लाए
    let cleanText = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक").trim();
    if (!cleanText) return;

    // वाक्यों को समझदारी से बांटें
    speechQueue = cleanText.split(/(?<=[।!?])\s+/).filter(s => s.trim().length > 0);
    if (speechQueue.length === 0) speechQueue = [cleanText];

    playNextChunk();
}

function speakFromBubble(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    speakText(text);
}

// 🎤 MIC: आवाज से टाइपिंग
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

    recognition.onerror = () => {
        document.getElementById('mic-btn').style.background = "#3b4a54";
    };
}

// 📋 COPY: जवाब कॉपी करना
function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;

    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText;
        btn.innerText = "COPIED ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
    }
