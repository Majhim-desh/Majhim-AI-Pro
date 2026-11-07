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

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    if (activeBtn) {
        activeBtn.innerText = "Listen 🔊";
        activeBtn = null;
    }
}

// ✂️ SAFE SPLIT: Google TTS की 200-अक्षर सीमा और "Last Line" फिक्स
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

    let finalQueue = [];
    sentences.forEach(s => {
        if (s.length < 180) {
            finalQueue.push(s);
        } else {
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
        fallbackSpeak(text);
    };

    currentAudio.play().catch(() => fallbackSpeak(text));
}

// 🔊 FALLBACK: ऑफलाइन/फेल होने पर ब्राउजर वॉइस का सहारा
function fallbackSpeak(text) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "hi-IN";

        utter.onend = () => {
            isSpeaking = false;
            index++;
            processQueue();
        };
        window.speechSynthesis.speak(utter);
    } else {
        isSpeaking = false;
        index++;
        processQueue();
    }
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
    const textContent = btn.closest('.bubble')?.querySelector('.text-content');
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
    try {
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
        }
    } catch (e) {}

    try {
        if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
        }
    } catch (e) {}

    if (activeBtn) activeBtn.innerText = "Resume ▶️";
}

function resumeSpeech() {
    isPaused = false;
    if (activeBtn) activeBtn.innerText = "Pause ⏸️";

    let played = false;

    try {
        if (currentAudio) {
            const playPromise = currentAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    played = true;
                }).catch(() => {
                    processQueue();
                });
            } else {
                played = true;
            }
        }
    } catch (e) {}

    if (!played) {
        try {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                if (window.speechSynthesis.paused || window.speechSynthesis.speaking) {
                    window.speechSynthesis.resume();
                } else {
                    processQueue();
                }
            } else {
                processQueue();
            }
        } catch (e) {
            processQueue();
        }
    }
}

// 🔘 TOGGLE FUNCTION (यह मिसिंग था जिसकी वजह से बटन काम नहीं कर रहा था)
function toggleSpeech(btn) {
    if (isPlaying) {
        startSpeech(btn);
    } else if (isPaused) {
        resumeSpeech();
    } else {
        pauseSpeech();
    }
}

function speakFromBubble(btn) {
    if (activeBtn && activeBtn !== btn) {
        stopSpeech();
        startSpeech(btn);
    } else if (!isPlaying && !isPaused) {
        startSpeech(btn);
    } else if (isPaused) {
        resumeSpeech();
    } else {
        pauseSpeech();
    }
}

// ==========================================
// 📋 COPY FUNCTIONS (TEXT & CODE)
// ==========================================
function copyToClipboard(btn) {
    const textContent = btn.closest('.bubble')?.querySelector('.text-content');
    if (!textContent) return;
    const text = textContent.innerText;
    
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
