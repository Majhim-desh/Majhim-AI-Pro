// ==========================================
// 🌐 LANGUAGE DETECTION & MAPPING
// ==========================================
let currentLangCode = 'hi'; // डिफ़ॉल्ट भाषा हिंदी

function detectTextLanguage(text) {
    try {
        // यदि tinyld लोड है और detect फंक्शन मौजूद है
        if (typeof tinyld !== 'undefined' && tinyld.detect) {
            const lang = tinyld.detect(text);
            if (lang) {
                // मैपिंग ताकि Google TTS और SpeechSynthesis सही कोड ले सकें
                const map = {
                    'hi': 'hi', 'en': 'en', 'es': 'es', 'fr': 'fr', 
                    'de': 'de', 'ja': 'ja', 'ko': 'ko', 'zh': 'zh-CN',
                    'ar': 'ar', 'ru': 'ru', 'pt': 'pt', 'bn': 'bn'
                };
                return map[lang] || 'hi';
            }
        }
    } catch (e) {
        console.error("Lang detection error:", e);
    }
    return 'hi'; // अगर डिटेक्ट न हो तो हिंदी मान लो
}

// ==========================================
// 🎤 VOICE TYPING (MIC BUTTON LOGIC)
// ==========================================
let recognition = null;

function startVoiceTyping() {
    const inputField = document.getElementById('user-input');
    const micBtn = document.getElementById('mic-btn');

    if (!('webkitSpeechRecognition' in window)) {
        alert("Sorry, your browser does not support speech recognition.");
        return;
    }

    if (recognition) {
        try { recognition.stop(); } catch (e) {}
        recognition = null;
    }

    recognition = new webkitSpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
        micBtn.innerText = "🛑";
        micBtn.style.background = "#ff4444";
    };

    recognition.onresult = (event) => {
        if (inputField) {
            inputField.value = event.results[0][0].transcript;
        }
    };

    recognition.onerror = (e) => {
        micBtn.innerText = "🎤";
        micBtn.style.background = "#00a884";
    };

    recognition.onend = () => {
        micBtn.innerText = "🎤";
        micBtn.style.background = "#00a884";
        recognition = null;
    };

    try {
        recognition.start();
    } catch (e) {
        micBtn.innerText = "🎤";
        micBtn.style.background = "#00a884";
        recognition = null;
    }
}

// ==========================================
// 🎤 STABLE & SMART VOICE ENGINE
// ==========================================
let queue = [];
let index = 0;
let isPlaying = false;
let isPaused = false;
let isSpeaking = false;
let currentAudio = null;
let activeBtn = null;

function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    isSpeaking = false;

    if (currentAudio) {
        try {
            currentAudio.onended = null;
            currentAudio.onerror = null;
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio.src = "";
            if (typeof currentAudio.load === 'function') {
                currentAudio.load();
            }
        } catch (e) {}
        currentAudio = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    if (activeBtn) {
        activeBtn.innerText = "Listen 🔊";
        activeBtn = null;
    }
}

function splitText(text) {
    if (!text) return [];
    text = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");

    let sentences = [];
    let current = "";

    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        current += char;
        if ("।!?.".includes(char)) {
            if (char === '.' && i + 1 < text.length && text[i + 1] !== ' ' && !isNaN(text[i - 1])) {
                continue;
            }
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

function speak(text) {
    if (!isPlaying || isPaused) return;

    if (currentAudio) {
        try {
            currentAudio.onended = null;
            currentAudio.onerror = null;
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio.src = "";
        } catch (e) {}
        currentAudio = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    isSpeaking = true;
    // यहाँ डिटेक्ट की गई भाषा का उपयोग हो रहा है (tl=currentLangCode)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${currentLangCode}&client=tw-ob`;

    try {
        currentAudio = new Audio(url);
        let fallbackStarted = false;

        const triggerFallback = () => {
            if (fallbackStarted) return;
            fallbackStarted = true;
            fallbackSpeak(text);
        };

        currentAudio.onended = () => {
            isSpeaking = false;
            if (isPlaying && !isPaused) {
                index++;
                processQueue();
            }
        };

        currentAudio.onerror = () => {
            triggerFallback();
        };

        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                triggerFallback();
            });
        }
    } catch (e) {
        fallbackSpeak(text);
    }
}

function fallbackSpeak(text) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = currentLangCode === 'en' ? 'en-US' : (currentLangCode + '-' + currentLangCode.toUpperCase());

            utter.onend = () => {
                isSpeaking = false;
                if (isPlaying && !isPaused) {
                    index++;
                    processQueue();
                }
            };
            
            utter.onerror = () => {
                isSpeaking = false;
                if (isPlaying && !isPaused) {
                    index++;
                    processQueue();
                }
            };

            window.speechSynthesis.speak(utter);
            return;
        } catch (e) {}
    }
    
    isSpeaking = false;
    index++;
    processQueue();
}

function processQueue() {
    if (!isPlaying || isPaused || isSpeaking) return;

    if (index >= queue.length) {
        stopSpeech();
        return;
    }
    speak(queue[index]);
}

function startSpeech(btn) {
    stopSpeech();
    const bubble = btn.closest('.bubble');
    if (!bubble) return;

    // कोड ब्लॉक को हटा दें ताकि कोडिंग को आवाज़ में न पढ़े
    const cloneBubble = bubble.cloneNode(true);
    const codeBlocks = cloneBubble.querySelectorAll('pre, code, .code-block');
    codeBlocks.forEach(block => block.remove());

    const textContent = cloneBubble.querySelector('.text-content');
    if (!textContent) return;

    const text = textContent.innerText;
    
    // 🌍 यहीं पर शुरू में ही पूरे टेक्स्ट की भाषा पहचान लो!
    currentLangCode = detectTextLanguage(text);

    queue = splitText(text);
    index = 0;
    isPlaying = true;
    isPaused = false;
    activeBtn = btn;
    btn.innerText = "Pause ⏸️";
    processQueue();
}

function pauseSpeech() {
    if (!isPlaying) return;
    isPaused = true;
    
    if (currentAudio) {
        try { currentAudio.pause(); } catch (e) {}
    }

    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        try { window.speechSynthesis.pause(); } catch (e) {}
    }

    if (activeBtn) activeBtn.innerText = "Resume ▶️";
}

function resumeSpeech() {
    if (!isPlaying || !isPaused) return;
    isPaused = false;
    if (activeBtn) activeBtn.innerText = "Pause ⏸️";

    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
        try {
            window.speechSynthesis.resume();
            return;
        } catch (e) {}
    }

    if (currentAudio && currentAudio.paused) {
        try {
            const playPromise = currentAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    regenAndPlayCurrentIndex();
                });
            }
        } catch (e) {
            regenAndPlayCurrentIndex();
        }
    } else {
        regenAndPlayCurrentIndex();
    }
}

function regenAndPlayCurrentIndex() {
    if (index < queue.length) {
        speak(queue[index]);
    } else {
        stopSpeech();
    }
}

function toggleSpeech(btn) {
    if (isPlaying && !isPaused) {
        pauseSpeech();
    } else if (isPlaying && isPaused) {
        resumeSpeech();
    } else {
        startSpeech(btn);
    }
}

function speakFromBubble(btn) {
    if (activeBtn && activeBtn !== btn) {
        stopSpeech();
    }
    toggleSpeech(btn);
}

// ==========================================
// 📋 ROBUST COPY FUNCTIONS (TEXT & CODE)
// ==========================================
function showCopiedFeedback(btn) {
    if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.innerText;
    }
    btn.innerText = "Copied ✅";
    clearTimeout(btn._copyTimer);
    btn._copyTimer = setTimeout(() => {
        btn.innerText = btn.dataset.originalText;
        delete btn.dataset.originalText;
    }, 2000);
}

function copyToClipboard(btn) {
    const textContent = btn.closest('.bubble')?.querySelector('.text-content');
    if (!textContent) return;
    const text = textContent.innerText;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showCopiedFeedback(btn);
        }).catch(() => {
            fallbackCopy(text, btn);
        });
    } else {
        fallbackCopy(text, btn);
    }
}

function copyCode(btn) {
    const codeEl = btn.closest('.code-block')?.querySelector("code");
    if (!codeEl) return;
    const code = codeEl.innerText;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            showCopiedFeedback(btn);
        }).catch(() => {
            fallbackCopy(code, btn);
        });
    } else {
        fallbackCopy(code, btn);
    }
}

function fallbackCopy(text, btn) {
    try {
        const t = document.createElement("textarea");
        t.value = text;
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
        showCopiedFeedback(btn);
    } catch (e) {
        alert("कॉपी करने में विफल रहा!");
    }
}
