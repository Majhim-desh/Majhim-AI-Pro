// 🎤 FINAL STABLE VOICE ENGINE (NO STREAM, PURE QUEUE)

let queue = [];
let index = 0;

let isPlaying = false;
let isPaused = false;
let isSpeaking = false;

let currentAudio = null;
let activeBtn = null;

// 🛑 RESET
function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    isSpeaking = false;
    queue = [];
    index = 0;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }

    window.speechSynthesis.cancel();

    if (activeBtn) {
        activeBtn.innerText = "Listen 🔊";
        activeBtn = null;
    }
}

// ✂️ SAFE SPLIT (NO REGEX HEAVY)
function splitText(text) {
    text = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");

    let sentences = [];
    let current = "";

    for (let char of text) {
        current += char;

        if ("।!?.".includes(char)) {
            sentences.push(current.trim());
            current = "";
        }
    }

    if (current.trim()) {
        sentences.push(current.trim());
    }

    return sentences.length ? sentences : [text];
}

// 🔊 SPEAK
function speak(text) {
    if (!isPlaying || isPaused) return;

    isSpeaking = true;

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    currentAudio = new Audio(url);

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

    currentAudio.play().catch(() => {
        fallbackSpeak(text);
    });
}

// 🔊 FALLBACK
function fallbackSpeak(text) {
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "hi-IN";

    utter.onend = () => {
        isSpeaking = false;
        index++;
        processQueue();
    };

    window.speechSynthesis.speak(utter);
}

// 🔁 QUEUE PROCESSOR
function processQueue() {
    if (!isPlaying || isPaused || isSpeaking) return;

    if (index >= queue.length) {
        stopSpeech();
        return;
    }

    speak(queue[index]);
}

// ▶️ START
function startSpeech(btn) {
    stopSpeech();

    const text = btn.closest('.bubble').querySelector('.text-content').innerText;

    queue = splitText(text);
    index = 0;

    isPlaying = true;
    isPaused = false;
    activeBtn = btn;

    btn.innerText = "Pause ⏸️";

    processQueue();
}

// ⏸️ PAUSE
function pauseSpeech() {
    isPaused = true;

    if (currentAudio) currentAudio.pause();
    window.speechSynthesis.pause();

    if (activeBtn) activeBtn.innerText = "Resume ▶️";
}

// ▶️ RESUME
function resumeSpeech() {
    isPaused = false;

    if (activeBtn) activeBtn.innerText = "Pause ⏸️";

    if (currentAudio) {
        currentAudio.play().catch(() => processQueue());
    } else {
        processQueue();
    }
}

// 🔁 TOGGLE
function toggleSpeech(btn) {
    if (!isPlaying) {
        startSpeech(btn);
    } else if (isPaused) {
        resumeSpeech();
    } else {
        pauseSpeech();
    }
}

// 🎯 BUTTON
function speakFromBubble(btn) {
    if (activeBtn && activeBtn !== btn) stopSpeech();
    toggleSpeech(btn);
}

// 📋 COPY (WITH FALLBACK)
function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;

    const success = () => {
        const old = btn.innerText;
        btn.innerText = "Copied ✅";
        setTimeout(() => btn.innerText = old, 2000);
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(success).catch(() => fallbackCopy(text, success));
    } else {
        fallbackCopy(text, success);
    }
}

function fallbackCopy(text, cb) {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    document.body.removeChild(t);
    cb();
}
// 💻 COPY CODE BLOCK (SAFE ADD-ON)
function copyCode(btn) {
    const codeEl = btn.closest('.code-block').querySelector('code');

    if (!codeEl) return;

    const code = codeEl.innerText;

    const success = () => {
        const old = btn.innerText;
        btn.innerText = "Copied ✅";
        setTimeout(() => btn.innerText = old, 2000);
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(code)
            .then(success)
            .catch(() => fallbackCopy(code, success));
    } else {
        fallbackCopy(code, success);
    }
}
