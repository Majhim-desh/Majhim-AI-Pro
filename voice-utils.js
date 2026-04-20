// 🎤 FINAL PRO VOICE ENGINE (No Freeze + Safe Split + Clean UI)

let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let isFinished = false;
let isSpeaking = false;

let queue = [];
let index = 0;
let lastBtn = null;
let resumeInterval = null;
let useFallback = false;

// 🛑 RESET
function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    isFinished = false;
    isSpeaking = false;

    queue = [];
    index = 0;

    if (resumeInterval) {
        clearInterval(resumeInterval);
        resumeInterval = null;
    }

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }

    window.speechSynthesis.cancel();

    document.querySelectorAll('.action-btn').forEach(btn => {
        if (btn.innerText.includes("Pause") || btn.innerText.includes("Resume")) {
            btn.innerText = "Listen 🔊";
        }
    });
}

// ✂️ SAFE SPLIT (FIXED)
function splitText(text) {
    text = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक").trim();

    // अगर punctuation नहीं है → पूरा text return
    if (!/[।!?]/.test(text)) {
        return [text];
    }

    return text
        .split(/(?<=[।!?])\s*/)
        .map(s => s.trim())
        .filter(Boolean);
}

// 🚀 STREAM PUSH
function streamSpeak(chunk) {
    const parts = splitText(chunk);
    queue.push(...parts);

    if (!isPlaying) {
        isPlaying = true;
        processQueue();
    }
}

// 🔁 PROCESSOR
function processQueue() {
    if (!isPlaying || isPaused || isSpeaking) return;

    if (index >= queue.length) {
        setTimeout(() => {
            if (index >= queue.length && !isSpeaking) {
                finishSpeech();
            }
        }, 400);
        return;
    }

    speak(queue[index]);
}

// 🔊 AUDIO ENGINE (FULLY SAFE)
function speak(text) {
    if (!isPlaying || isPaused) return;

    isSpeaking = true;

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    currentAudio = new Audio(url);
    currentAudio.preload = "auto";

    currentAudio.onended = () => {
        isSpeaking = false;
        index++;
        processQueue();
    };

    currentAudio.onerror = () => {
        isSpeaking = false; // ✅ FIX
        useFallback = true;
        fallbackSpeak(text);
    };

    currentAudio.play()
        .then(startResumeGuard)
        .catch(() => {
            isSpeaking = false; // ✅ FIX
            useFallback = true;
            fallbackSpeak(text);
        });
}

// 🔊 FALLBACK
function fallbackSpeak(text) {
    if (!isPlaying || isPaused) return;

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "hi-IN";

    isSpeaking = true;

    utter.onend = () => {
        isSpeaking = false;
        index++;
        processQueue();
    };

    utter.onerror = () => {
        isSpeaking = false; // ✅ FIX
        index++;
        processQueue();
    };

    window.speechSynthesis.speak(utter);
}

// 🛡️ RESUME GUARD
function startResumeGuard() {
    if (resumeInterval) clearInterval(resumeInterval);

    resumeInterval = setInterval(() => {
        if (isPlaying && !isPaused && currentAudio && currentAudio.paused && !currentAudio.ended) {
            currentAudio.play().catch(() => {});
        }
    }, 1200);
}

// 🏁 FINISH (SAFE BUTTON RESET)
function finishSpeech() {
    isPlaying = false;
    isFinished = true;
    isSpeaking = false;

    if (resumeInterval) {
        clearInterval(resumeInterval);
        resumeInterval = null;
    }

    // ✅ SAFE: सिर्फ lastBtn को बदलो
    if (lastBtn && lastBtn.classList.contains("action-btn")) {
        lastBtn.innerText = "Listen 🔊";
    }
}

// ⏸️ PAUSE
function pauseSpeech(btn) {
    isPaused = true;

    if (currentAudio) currentAudio.pause();
    window.speechSynthesis.pause();

    if (resumeInterval) {
        clearInterval(resumeInterval);
        resumeInterval = null;
    }

    btn.innerText = "Resume ▶️";
}

// ▶️ RESUME
function resumeSpeech(btn) {
    isPaused = false;
    btn.innerText = "Pause ⏸️";
    isSpeaking = false;

    if (currentAudio) {
        currentAudio.play()
            .then(startResumeGuard)
            .catch(() => processQueue());
    } else {
        processQueue();
    }
}

// 🔁 TOGGLE
function toggleSpeech(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;

    if (!isPlaying || isFinished) {
        stopSpeech();

        isPlaying = true;
        isPaused = false;
        isFinished = false;

        streamSpeak(text);
        btn.innerText = "Pause ⏸️";
    }
    else if (isPlaying && !isPaused) {
        pauseSpeech(btn);
    }
    else {
        resumeSpeech(btn);
    }
}

// 🎯 HOOK
function speakFromBubble(btn) {
    if (lastBtn && lastBtn !== btn) stopSpeech();
    lastBtn = btn;
    toggleSpeech(btn);
}
