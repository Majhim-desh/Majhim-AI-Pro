// 🎤 Majhim AI Pro - FINAL HYBRID STREAMING VOICE ENGINE (Bug-Free Edition)

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let useFallback = false;

let streamBuffer = "";
let isStreaming = false;
let resumeInterval = null;
let lastBtn = null; // 🎯 यह ट्रैक करने के लिए कि कौन सा बटन दब रहा है

// 🛡️ Resume System (Cleaner Protection for MIUI/Android)
function startResumeSystem() {
    if (resumeInterval) clearInterval(resumeInterval);
    resumeInterval = setInterval(() => {
        if (isPlaying && !isPaused && currentAudio && currentAudio.paused && !currentAudio.ended) {
            currentAudio.play().catch(() => {});
        }
    }, 1000);
}

// 🔊 Speak one chunk (Google TTS)
function speakChunk(text) {
    if (!isPlaying || isPaused) return;

    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    currentAudio = new Audio(voiceUrl);

    currentAudio.onended = () => {
        processStream();
    };

    currentAudio.onerror = () => {
        useFallback = true;
        fallbackSpeak(text);
    };

    currentAudio.play()
        .then(() => startResumeSystem())
        .catch(() => {
            useFallback = true;
            fallbackSpeak(text);
        });
}

// 🔊 Fallback Voice (System Speech Synthesis)
function fallbackSpeak(text) {
    if (!isPlaying || isPaused) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';

    utter.onend = () => {
        processStream();
    };

    window.speechSynthesis.speak(utter);
}

// 🚀 STREAM PROCESSOR (Smart Sentence Splicing)
function processStream() {
    if (!isPlaying || isPaused) return;

    if (!streamBuffer.trim()) {
        isStreaming = false;
        // अगर बफर खत्म हो गया है, तो सब बंद करें
        if (!currentAudio || currentAudio.ended) stopSpeech(); 
        return;
    }

    // RegEx: वाक्य को पूर्ण विराम (।) या सवालिया निशान (?) पर तोड़ें
    const match = streamBuffer.match(/(.+?[।!?])/);

    if (match) {
        const sentence = match[1];
        streamBuffer = streamBuffer.replace(sentence, "");

        if (useFallback) {
            fallbackSpeak(sentence);
        } else {
            speakChunk(sentence);
        }
    } else {
        // अगर अभी वाक्य पूरा नहीं हुआ, तो थोड़ा इंतज़ार करें
        setTimeout(processStream, 200);
    }
}

// 🎯 STREAM START
function streamSpeak(text) {
    streamBuffer += " " + text;

    if (!isStreaming) {
        isStreaming = true;
        processStream();
    }
}

// 🛑 STOP ALL (Full Cleanup + Button Reset Fix)
function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    isStreaming = false;
    streamBuffer = "";

    window.speechSynthesis.cancel();

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }

    if (resumeInterval) {
        clearInterval(resumeInterval);
        resumeInterval = null;
    }

    // ✅ यह लाइन पक्का करेगी कि बात खत्म होते ही बटन वापस "Listen" बन जाए
    document.querySelectorAll('.action-btn').forEach(btn => {
        // हम उन सभी बटन्स को ढूंढ रहे हैं जिनमें Pause या Resume लिखा है
        if (btn.innerText.includes("Pause") || btn.innerText.includes("Resume")) {
            btn.innerText = "Listen 🔊";
        }
    });
}

// ⏸️ Pause Logic
function pauseSpeech(btn) {
    isPaused = true;
    if (currentAudio) currentAudio.pause();
    window.speechSynthesis.pause();
    btn.innerText = "Resume ▶️";
}

// ▶️ Resume Logic
function resumeSpeech(btn) {
    isPaused = false;
    btn.innerText = "Pause ⏸️";

    if (useFallback) {
        window.speechSynthesis.resume();
    } else {
        if (currentAudio) {
            currentAudio.play().catch(() => processStream());
        } else {
            processStream();
        }
    }
}

// 🔁 TOGGLE Controller
function toggleSpeech(btn) {
    if (!isPlaying) {
        const text = btn.closest('.bubble').querySelector('.text-content').innerText;
        isPlaying = true;
        isPaused = false;
        useFallback = false;
        streamSpeak(text);
        btn.innerText = "Pause ⏸️";
        return;
    }

    if (isPlaying && !isPaused) {
        pauseSpeech(btn);
    } else {
        resumeSpeech(btn);
    }
}

// 🎯 MAIN BUTTON HOOK (Bug-Fix: Checks if it's a new message)
function speakFromBubble(btn) {
    if (lastBtn && lastBtn !== btn) {
        stopSpeech(); // सिर्फ तब रिसेट करें जब यूजर किसी दूसरे बबल पर क्लिक करे
    }
    lastBtn = btn;
    toggleSpeech(btn);
}

// 🎤 MIC: Voice Typing logic
function startVoiceTyping() {
    if (!recognition) {
        alert("माफ़ करना, वॉइस टाइपिंग सपोर्ट नहीं है।");
        return;
    }

    recognition.lang = 'hi-IN';
    recognition.start();

    const micBtn = document.getElementById('mic-btn');
    micBtn.style.background = "#ea0038";

    recognition.onresult = (event) => {
        const input = document.getElementById('user-input');
        input.value += event.results[0][0].transcript;
    };

    recognition.onspeechend = () => {
        recognition.stop();
        micBtn.style.background = "#00a884";
    };

    recognition.onerror = () => {
        micBtn.style.background = "#00a884";
    };
}

// 📋 COPY FUNCTIONS
function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText;
        btn.innerText = "COPIED ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}

function copyCode(btn) {
    const code = btn.parentElement.querySelector("code").innerText;
    navigator.clipboard.writeText(code).then(() => {
        const old = btn.innerText;
        btn.innerText = "Copied ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}
