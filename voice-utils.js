// 🎤 UNIVERSAL VOICE ENGINE (The Final Fix)

let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let isStreaming = false; // 👈 इसे ट्रैक करना ज़रूरी है
let streamBuffer = "";
let resumeInterval = null;
let lastBtn = null;
let useFallback = false;

const isMobile = /Android|iPhone/i.test(navigator.userAgent);

// 🛑 STOP: यह फंक्शन आवाज़ को "Unblock" करेगा
function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    isStreaming = false;
    streamBuffer = "";

    // 1. Fallback को पूरी तरह साफ़ करो
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    // 2. Audio ऑब्जेक्ट को जड़ से खत्म करो
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.onended = null; // Memory leak रोको
        currentAudio.onerror = null;
        currentAudio.src = "";
        currentAudio = null;
    }

    if (resumeInterval) {
        clearInterval(resumeInterval);
        resumeInterval = null;
    }

    // 3. बटन्स को रिसेट करो
    document.querySelectorAll('.action-btn').forEach(btn => {
        if (btn.innerText.includes("Pause") || btn.innerText.includes("Resume")) {
            btn.innerText = "Listen 🔊";
        }
    });
}

// 🚀 PROCESSOR: यहाँ Logic एकदम टाइट है
function processStream() {
    if (!isPlaying || isPaused) return;

    if (!streamBuffer.trim()) {
        isStreaming = false; 
        // अगर बफर खाली है और आवाज़ खत्म हो गई है, तभी स्टॉप करो
        if (!currentAudio || currentAudio.ended) {
            setTimeout(() => { if (!isStreaming && !streamBuffer.trim()) stopSpeech(); }, 800);
        }
        return;
    }

    const match = streamBuffer.match(/(.+?[।!?])/);
    if (match) {
        const sentence = match[1];
        streamBuffer = streamBuffer.slice(sentence.length);
        
        if (useFallback) fallbackSpeak(sentence);
        else speakChunk(sentence);
    } else {
        // अगर अभी टाइपिंग चल रही है
        setTimeout(processStream, 300);
    }
}

// 🔊 CHUNK: Preload और Error Handling के साथ
function speakChunk(text) {
    if (!isPlaying || isPaused) return;

    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    currentAudio = new Audio(voiceUrl);
    currentAudio.preload = "auto";

    currentAudio.onended = () => processStream();
    currentAudio.onerror = () => { useFallback = true; fallbackSpeak(text); };

    currentAudio.play().catch(() => {
        useFallback = true;
        fallbackSpeak(text);
    });
}

// 🔊 FALLBACK
function fallbackSpeak(text) {
    if (!isPlaying || isPaused) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';
    utter.onend = () => processStream();
    window.speechSynthesis.speak(utter);
}

// ▶️ RESUME: सबसे ज़रूरी बदलाव
function resumeSpeech(btn) {
    isPaused = false;
    btn.innerText = "Pause ⏸️";

    if (useFallback) {
        window.speechSynthesis.resume();
        // अगर resume काम न करे तो restart करो
        setTimeout(() => { if(!window.speechSynthesis.speaking) processStream(); }, 500);
    } else {
        if (currentAudio) {
            currentAudio.play().catch(() => processStream());
        } else {
            processStream();
        }
    }
}

// ⏸️ PAUSE
function pauseSpeech(btn) {
    isPaused = true;
    if (currentAudio) currentAudio.pause();
    if (window.speechSynthesis) window.speechSynthesis.pause();
    btn.innerText = "Resume ▶️";
}

// 🔁 TOGGLE
function toggleSpeech(btn) {
    if (!isPlaying) {
        const text = btn.closest('.bubble').querySelector('.text-content').innerText;
        stopSpeech(); // पुराना सब साफ़ करो
        isPlaying = true;
        isStreaming = true;
        streamBuffer = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");
        processStream();
        btn.innerText = "Pause ⏸️";
    } else if (isPaused) {
        resumeSpeech(btn);
    } else {
        pauseSpeech(btn);
    }
}

function speakFromBubble(btn) {
    if (lastBtn && lastBtn !== btn) stopSpeech();
    lastBtn = btn;
    toggleSpeech(btn);
}
