// ==========================================
// 🌐 LANGUAGE DETECTION & MAPPING
// ==========================================
let currentLangCode = 'hi';

function detectTextLanguage(text) {
    try {
        if (typeof tinyld !== 'undefined' && tinyld.detect) {
            const lang = tinyld.detect(text);
            if (lang) {
                const map = {
                    'hi': 'hi', 'en': 'en', 'es': 'es', 'fr': 'fr', 
                    'de': 'de', 'ja': 'ja', 'ko': 'ko', 'zh-CN': 'zh-CN',
                    'ar': 'ar', 'ru': 'ru', 'pt': 'pt', 'bn': 'bn'
                };
                return map[lang] || 'hi';
            }
        }
    } catch (e) {
        console.error("Lang detection error:", e);
    }
    return 'hi';
}

// ==========================================
// 🌐 LOCALE TAG MAPPER (fallback के लिए सही tag)
// ==========================================
function toLocaleTag(langCode) {
    const map = {
        'hi': 'hi-IN',
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'zh-CN': 'zh-CN',
        'ar': 'ar-SA',
        'ru': 'ru-RU',
        'pt': 'pt-PT',
        'bn': 'bn-BD'
    };
    return map[langCode] || 'hi-IN';
}

// ==========================================
// 🎙️ VOICE CACHE (device पर सही voice)
// ==========================================
let cachedVoices = [];

function loadVoices() {
    if (!window.speechSynthesis) return;
    cachedVoices = window.speechSynthesis.getVoices() || [];
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getVoiceForLang(langTag) {
    if (!window.speechSynthesis) return null;
    if (cachedVoices.length === 0) loadVoices();

    const baseLang = langTag.split('-')[0];
    let voice = cachedVoices.find(v => v.lang === langTag);
    if (voice) return voice;

    voice = cachedVoices.find(v => v.lang && v.lang.toLowerCase().startsWith(baseLang.toLowerCase()));
    if (voice) return voice;

    return null;
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
        if (micBtn) {
            micBtn.innerText = "🛑";
            micBtn.style.background = "#ff4444";
        }
    };

    recognition.onresult = (event) => {
        if (inputField) {
            inputField.value = event.results[0][0].transcript;
        }
    };

    recognition.onerror = (e) => {
        if (micBtn) {
            micBtn.innerText = "🎤";
            micBtn.style.background = "#00a884";
        }
        recognition = null;
        if (e.error === 'not-allowed') {
            alert("माइक की permission दो भाई! Browser settings में जाकर allow करो।");
        } else if (e.error === 'no-speech' || e.error === 'aborted') {
            // चुप्पी या बंद — कोई alert नहीं
        } else {
            alert("Voice नहीं पकड़ पाया, दोबारा try करो");
        }
    };

    recognition.onend = () => {
        if (micBtn) {
            micBtn.innerText = "🎤";
            micBtn.style.background = "#00a884";
        }
        recognition = null;
    };

    try {
        recognition.start();
    } catch (e) {
        if (micBtn) {
            micBtn.innerText = "🎤";
            micBtn.style.background = "#00a884";
        }
        recognition = null;
    }
}

// ==========================================
// 🌲 TREEWALKER: EXTRACT TEXT WITHOUT CODE
// ==========================================
function extractTextWithoutCode(root) {
    if (!root) return "";

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.closest('pre, code, .code-block')) return NodeFilter.FILTER_REJECT;
                if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const parts = [];
    let n;
    while (n = walker.nextNode()) parts.push(n.nodeValue.trim());
    return parts.join(' ');
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
            // दशमलव (जैसे 3.14) पर सेंटेंस न टूटे
            if (char === '.' && i > 0 && i + 1 < text.length && text[i + 1] !== ' ' && !isNaN(text[i - 1])) {
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

            // ✅ सही locale tag और matched voice
            const langTag = toLocaleTag(currentLangCode);
            utter.lang = langTag;
            const matchedVoice = getVoiceForLang(langTag);
            if (matchedVoice) {
                utter.voice = matchedVoice;
            }

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

    const textContent = bubble.querySelector('.text-content');
    if (!textContent) return;

    // ✅ TreeWalker से सीधे text निकालो (clone नहीं, code block skip)
    const text = extractTextWithoutCode(textContent);
    if (!text || !text.trim()) return;

    // भाषा पहचानो
    currentLangCode = detectTextLanguage(text);

    queue = splitText(text);
    if (queue.length === 0) return;

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
// 📋 ROBUST COPY FUNCTIONS
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