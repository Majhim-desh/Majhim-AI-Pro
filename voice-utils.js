// 🎤 MAJHIM AI PRO - ULTIMATE VOICE & UI ENGINE
// (Fixes: Full Text Reading, Safe Copy Button, Mobile Stability)

let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let isFinished = false;
let isSpeaking = false;

let queue = [];
let index = 0;
let lastBtn = null;
let resumeInterval = null;

// 📋 1. COPY TEXT FUNCTION (Bulletproof Version)
function copyText(btn) {
    const bubble = btn.closest('.bubble');
    const text = bubble.querySelector('.text-content').innerText;
    
    const doSuccess = () => {
        const originalText = btn.innerText;
        btn.innerText = "Copied! ✅";
        setTimeout(() => { btn.innerText = originalText; }, 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(doSuccess).catch(() => fallbackCopy(text, btn, doSuccess));
    } else {
        fallbackCopy(text, btn, doSuccess);
    }
}

function fallbackCopy(text, btn, callback) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        callback();
    } catch (err) {
        console.error("Copy failed");
    }
    document.body.removeChild(textArea);
}

// 🛑 2. RESET ENGINE
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

    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // सिर्फ Voice वाले बटनों को रिसेट करें
    document.querySelectorAll('.action-btn').forEach(btn => {
        if (btn.innerText.includes("Pause") || btn.innerText.includes("Resume")) {
            btn.innerText = "Listen 🔊";
        }
    });
}

// ✂️ 3. SAFE SPLIT (सभी 10 लाइनें पढ़ने के लिए)
function splitText(text) {
    // कोड ब्लॉक्स हटाएं
    let cleanText = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक").trim();

    // पुराने मोबाइल के लिए सुरक्षित स्पिलिटिंग (पाइप मेथड)
    let sentences = cleanText
        .replace(/([।!?])/g, "$1|") 
        .split("|")
        .map(s => s.trim())
        .filter(Boolean);

    return sentences.length > 0 ? sentences : [cleanText];
}

// 🚀 4. STREAM PUSH
function streamSpeak(text) {
    queue = splitText(text); // कतार तैयार करें
    index = 0;
    
    if (!isPlaying) {
        isPlaying = true;
        isFinished = false;
        processQueue();
    }
}

// 🔁 5. MAIN PROCESSOR
function processQueue() {
    if (!isPlaying || isPaused || isSpeaking) return;

    if (index >= queue.length) {
        setTimeout(() => {
            if (index >= queue.length && !isSpeaking) {
                finishSpeech();
            }
        }, 500);
        return;
    }

    speak(queue[index]);
}

// 🔊 6. AUDIO ENGINE (Google TTS)
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
        isSpeaking = false;
        index++;
        processQueue();
    };

    currentAudio.play()
        .then(() => startResumeGuard())
        .catch(() => {
            isSpeaking = false;
            index++;
            processQueue();
        });
}

// 🛡️ 7. RESUME GUARD (Mobile Stay-Alive)
function startResumeGuard() {
    if (resumeInterval) clearInterval(resumeInterval);
    resumeInterval = setInterval(() => {
        if (isPlaying && !isPaused && currentAudio && currentAudio.paused && !currentAudio.ended) {
            currentAudio.play().catch(() => {});
        }
    }, 1500);
}

// 🏁 8. FINISH (Clean UI Reset)
function finishSpeech() {
    isPlaying = false;
    isFinished = true;
    isSpeaking = false;
    if (resumeInterval) {
        clearInterval(resumeInterval);
        resumeInterval = null;
    }
    if (lastBtn && (lastBtn.innerText.includes("Pause") || lastBtn.innerText.includes("Resume"))) {
        lastBtn.innerText = "Listen 🔊";
    }
}

// ⏸️ 9. PAUSE / RESUME
function pauseSpeech(btn) {
    isPaused = true;
    if (currentAudio) currentAudio.pause();
    btn.innerText = "Resume ▶️";
}

function resumeSpeech(btn) {
    isPaused = false;
    btn.innerText = "Pause ⏸️";
    isSpeaking = false;
    if (currentAudio) {
        currentAudio.play().then(() => startResumeGuard()).catch(() => processQueue());
    } else {
        processQueue();
    }
}

// 🔁 10. MAIN TOGGLE
function toggleSpeech(btn) {
    const bubble = btn.closest('.bubble');
    const text = bubble.querySelector('.text-content').innerText;

    if (!isPlaying || isFinished) {
        stopSpeech();
        lastBtn = btn;
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

// 🎯 BUTTON HOOK
function speakFromBubble(btn) {
    if (lastBtn && lastBtn !== btn) stopSpeech();
    lastBtn = btn;
    toggleSpeech(btn);
}
