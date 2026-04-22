// ==========================================
// 🎤 VOICE TYPING (MIC BUTTON LOGIC)
// ==========================================
function startVoiceTyping() {
    const inputField = document.getElementById('user-input');
    const micBtn = document.getElementById('mic-btn');
    
    if (!('webkitSpeechRecognition' in window)) {
        alert("Sorry, your browser does not support speech recognition.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'hi-IN'; // हिंदी सपोर्ट के लिए
    recognition.interimResults = false;

    recognition.onstart = () => {
        micBtn.innerText = "🛑";
        micBtn.style.background = "#ff4444";
    };

    recognition.onresult = (event) => {
        inputField.value = event.results[0][0].transcript;
    };

    recognition.onend = () => {
        micBtn.innerText = "🎤";
        micBtn.style.background = "#00a884";
    };

    recognition.start();
}

// ==========================================
// 🎤 FINAL STABLE VOICE ENGINE (PURE QUEUE)
// ==========================================
let queue = [];
let index = 0;
let isPlaying = false;
let isPaused = false;
let isSpeaking = false;
let currentAudio = null;
let activeBtn = null;

// 🛑 RESET: इंजन को पूरी तरह रोकने के लिए
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

// ✂️ SAFE SPLIT: Google TTS की 200-अक्षर सीमा और "Last Line" फिक्स
function splitText(text) {
    // 1. कोड ब्लॉक को हटाकर सिर्फ शब्द रखें ताकि TTS अटके नहीं
    text = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");

    let sentences = [];
    let current = "";

    // 2. विराम चिन्हों पर तोड़ें
    for (let char of text) {
        current += char;
        if ("।!?.".includes(char)) {
            sentences.push(current.trim());
            current = "";
        }
    }
    
    // 🔥 CRITICAL FIX: अगर आखिरी लाइन में फुलस्टॉप नहीं है, तो उसे भी जोड़ें
    if (current.trim()) {
        sentences.push(current.trim());
    }

    // 3. पक्का करें कि कोई भी लाइन 180 अक्षर से बड़ी न हो
    let finalQueue = [];
    sentences.forEach(s => {
        if (s.length < 180) {
            finalQueue.push(s);
        } else {
            // बहुत लंबी लाइनों को शब्दों (Space) के आधार पर काटें
            let words = s.split(' ');
            let chunk = '';
            words.forEach(w => {
                if ((chunk + w).length < 180) {
                    chunk += w + ' ';
                } else {
                    finalQueue.push(chunk.trim());
                    chunk = w + ' ';
                }
            });
            if (chunk.trim()) finalQueue.push(chunk.trim());
        }
    });

    return finalQueue.filter(line => line.length > 0);
}

// 🔊 SPEAK: लाइन बजाने के लिए
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
        // अगर ऑनलाइन TTS फेल हो, तो ब्राउजर का अपना वॉइस (Fallback) इस्तेमाल करें
        fallbackSpeak(text);
    };

    currentAudio.play().catch(() => fallbackSpeak(text));
}

// 🔊 FALLBACK: ऑफलाइन/फेल होने पर ब्राउजर वॉइस का सहारा
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

// 🔁 QUEUE PROCESSOR: एक के बाद एक लाइन चलाने वाला दिमाग
function processQueue() {
    if (!isPlaying || isPaused || isSpeaking) return;

    if (index >= queue.length) {
        stopSpeech();
        return;
    }
    speak(queue[index]);
}

// ▶️ CONTROL FUNCTIONS
function startSpeech(btn) {
    stopSpeech();
    const textContent = btn.closest('.bubble').querySelector('.text-content');
    if (!textContent) return;

    const text = textContent.innerText;
    queue = splitText(text);
    index = 0;
    isPlaying = true;
    isPaused = false;
    activeBtn = btn;
    btn.innerText = "Pause ⏸️";
    processQueue();
}

function pauseSpeech() {
    isPaused = true;
    if (currentAudio) currentAudio.pause();
    window.speechSynthesis.pause();
    if (activeBtn) activeBtn.innerText = "Resume ▶️";
}

function resumeSpeech() {
    isPaused = false;
    if (activeBtn) activeBtn.innerText = "Pause ⏸️";
    if (currentAudio) {
        currentAudio.play().catch(() => processQueue());
    } else {
        processQueue();
    }
    window.speechSynthesis.resume();
}

function toggleSpeech(btn) {
    if (!isPlaying) {
        startSpeech(btn);
    } else if (isPaused) {
        resumeSpeech();
    } else {
        pauseSpeech();
    }
}

function speakFromBubble(btn) {
    if (activeBtn && activeBtn !== btn) stopSpeech();
    toggleSpeech(btn);
}

// ==========================================
// 📋 COPY FUNCTIONS (TEXT & CODE)
// ==========================================
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

function copyCode(btn) {
    const codeEl = btn.closest('.code-block')?.querySelector("code");
    if (!codeEl) return;
    const code = codeEl.innerText;
    const success = () => {
        const old = btn.innerText;
        btn.innerText = "Copied ✅";
        setTimeout(() => btn.innerText = old, 2000);
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(success).catch(() => fallbackCopy(code, success));
    } else {
        fallbackCopy(code, success);
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
