// 🎤 UNIVERSAL VOICE ENGINE (Mobile + Desktop Optimized)

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let useFallback = false;

let streamBuffer = "";
let resumeInterval = null;
let lastBtn = null;

// 📱 Detect Low-end Mobile
const isMobile = /Android|iPhone/i.test(navigator.userAgent);

// 🛡️ Resume System (Only for Mobile)
function startResumeSystem() {
    if (!isMobile) return;

    if (resumeInterval) clearInterval(resumeInterval);
    resumeInterval = setInterval(() => {
        if (isPlaying && !isPaused && currentAudio && currentAudio.paused && !currentAudio.ended) {
            currentAudio.play().catch(() => {});
        }
    }, 1200);
}

// 🔊 Speak Chunk
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

// 🔊 Fallback (Better on Mobile)
function fallbackSpeak(text) {
    if (!isPlaying || isPaused) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';

    // 📱 Mobile पर slow rate better रहता है
    utter.rate = isMobile ? 0.95 : 1;

    utter.onend = () => processStream();

    window.speechSynthesis.speak(utter);
}

// 🚀 Stream Processor
function processStream() {
    if (!isPlaying || isPaused) return;

    if (!streamBuffer.trim()) {
        setTimeout(() => {
            if (!streamBuffer.trim() && (!currentAudio || currentAudio.ended)) {
                stopSpeech();
            }
        }, 600);
        return;
    }

    const match = streamBuffer.match(/(.+?[।!?])/);

    if (match) {
        const sentence = match[1];
        streamBuffer = streamBuffer.slice(sentence.length);

        if (useFallback) fallbackSpeak(sentence);
        else speakChunk(sentence);

    } else {
        setTimeout(processStream, 250);
    }
}

// 🛑 STOP
function stopSpeech() {
    isPlaying = false;
    isPaused = false;
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

    // Reset buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.innerText = "Listen 🔊";
    });
}

// ⏸️ Pause
function pauseSpeech(btn) {
    isPaused = true;
    if (currentAudio) currentAudio.pause();
    window.speechSynthesis.pause();
    btn.innerText = "Resume ▶️";
}

// ▶️ Resume
function resumeSpeech(btn) {
    isPaused = false;
    btn.innerText = "Pause ⏸️";

    if (useFallback) {
        window.speechSynthesis.resume();
        if (!window.speechSynthesis.speaking) processStream();
    } else {
        if (currentAudio && currentAudio.readyState >= 2) {
            currentAudio.play().catch(() => processStream());
        } else {
            processStream();
        }
    }
}

// 🔁 Toggle (Safe)
function toggleSpeech(btn) {
    // 🚫 Spam Protection
    if (btn.disabled) return;
    btn.disabled = true;
    setTimeout(() => btn.disabled = false, 300);

    if (!isPlaying) {
        const text = btn.closest('.bubble').querySelector('.text-content').innerText;

        isPlaying = true;
        isPaused = false;
        useFallback = false;

        streamBuffer = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");

        processStream();
        btn.innerText = "Pause ⏸️";

    } else if (isPaused) {
        resumeSpeech(btn);
    } else {
        pauseSpeech(btn);
    }
}

// 🎯 Button Hook
function speakFromBubble(btn) {
    if (lastBtn && lastBtn !== btn) stopSpeech();
    lastBtn = btn;
    toggleSpeech(btn);
}
