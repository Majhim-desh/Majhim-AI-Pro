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

function toLocaleTag(langCode) {
    const map = {
        'hi': 'hi-IN', 'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR',
        'de': 'de-DE', 'ja': 'ja-JP', 'ko': 'ko-KR', 'zh-CN': 'zh-CN',
        'ar': 'ar-SA', 'ru': 'ru-RU', 'pt': 'pt-PT', 'bn': 'bn-BD'
    };
    return map[langCode] || 'hi-IN';
}

// ==========================================
// 🎙️ VOICE CACHE
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
    return voice || null;
}

// ==========================================
// 🎤 VOICE TYPING (MIC)
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
        if (micBtn) { micBtn.innerText = "🛑"; micBtn.style.background = "#ff4444"; }
    };

    recognition.onresult = (event) => {
        if (inputField) inputField.value = event.results[0][0].transcript;
    };

    recognition.onerror = (e) => {
        if (micBtn) { micBtn.innerText = "🎤"; micBtn.style.background = "#00a884"; }
        recognition = null;
        if (e.error === 'not-allowed') {
            alert("माइक की permission दो भाई!");
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
            alert("Voice नहीं पकड़ पाया, दोबारा try करो");
        }
    };

    recognition.onend = () => {
        if (micBtn) { micBtn.innerText = "🎤"; micBtn.style.background = "#00a884"; }
        recognition = null;
    };

    try { recognition.start(); } catch (e) {
        if (micBtn) { micBtn.innerText = "🎤"; micBtn.style.background = "#00a884"; }
        recognition = null;
    }
}

// ==========================================
// 🌲 TREEWALKER: EXTRACT TEXT WITHOUT CODE
// ==========================================
function extractTextWithoutCode(root) {
    if (!root) return "";
    const walker = document.createTreeWalker(
        root, NodeFilter.SHOW_TEXT,
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
// 🐛 DEBUG PANEL (screen पर live)
// ==========================================
let debugLogs = [];
function dbg(msg) {
    const t = Math.floor(Date.now() / 100) % 100000;
    const line = `[${t}] ${msg}`;
    debugLogs.push(line);
    console.log(line);
    if (debugLogs.length > 15) debugLogs.shift();

    let el = document.getElementById('_dbg');
    if (!el) {
        el = document.createElement('div');
        el.id = '_dbg';
        el.style.cssText = 'position:fixed;bottom:75px;left:5px;right:5px;background:rgba(0,0,0,0.92);color:#0f0;font:11px monospace;padding:8px;border-radius:5px;max-height:150px;overflow-y:auto;z-index:99999;white-space:pre-wrap;';
        document.body.appendChild(el);
    }
    el.innerText = debugLogs.slice(-6).join('\n');
    clearTimeout(el._hide);
    el._hide = setTimeout(() => el.remove(), 15000);
}

// ==========================================
// 🎤 VOICE ENGINE (CASCADE FIX + DIAGNOSTIC)
// ==========================================
let queue = [];
let index = 0;
let isPlaying = false;
let isPaused = false;
let isSpeaking = false;
let currentAudio = null;
let currentUtter = null;
let activeBtn = null;
let failedChunks = 0;

function cleanupUtter() {
    if (currentUtter) {
        try { currentUtter.onend = null; currentUtter.onerror = null; } catch (e) {}
        currentUtter = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
}

function stopSpeech() {
    dbg("⏹ stopSpeech");
    isPlaying = false;
    isPaused = false;
    isSpeaking = false;
    failedChunks = 0;

    if (currentAudio) {
        try {
            currentAudio.onended = null;
            currentAudio.onerror = null;
            currentAudio.pause();
            currentAudio.src = "";
            if (typeof currentAudio.load === 'function') currentAudio.load();
        } catch (e) {}
        currentAudio = null;
    }

    cleanupUtter();

    if (activeBtn) {
        activeBtn.innerText = "Listen 🔊";
        activeBtn = null;
    }
}

function splitText(text) {
    if (!text) return [];
    text = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");

    let sentences = [], current = "";
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        current += char;
        if ("।!?.".includes(char)) {
            if (char === '.' && i > 0 && i + 1 < text.length && text[i + 1] !== ' ' && !isNaN(text[i - 1])) continue;
            sentences.push(current.trim());
            current = "";
        }
    }
    if (current.trim()) sentences.push(current.trim());

    let finalQueue = [];
    sentences.forEach(s => {
        if (s.length < 180) {
            finalQueue.push(s);
        } else {
            let words = s.split(' '), chunk = '';
            words.forEach(w => {
                if ((chunk + w).length < 180) chunk += w + ' ';
                else { finalQueue.push(chunk.trim()); chunk = w + ' '; }
            });
            if (chunk.trim()) finalQueue.push(chunk.trim());
        }
    });
    return finalQueue.filter(line => line.length > 0);
}

function speak(text) {
    if (!isPlaying || isPaused) return;

    dbg(`▶ speak #${index}/${queue.length} (${text.length}c)`);

    if (currentAudio) {
        try {
            currentAudio.onended = null;
            currentAudio.onerror = null;
            currentAudio.pause();
            currentAudio.src = "";
        } catch (e) {}
        currentAudio = null;
    }
    cleanupUtter();

    isSpeaking = true;
    const startTime = Date.now();
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${currentLangCode}&client=tw-ob`;

    try {
        currentAudio = new Audio(url);
        let settled = false;

        const fail = (reason) => {
            if (settled) return;
            settled = true;
            isSpeaking = false;
            dbg(`❌ #${index} audio: ${reason}`);
            fallbackSpeak(text);
        };

        currentAudio.onended = () => {
            if (settled) return;
            const elapsed = Date.now() - startTime;

            // 🆕 "Too fast" detection — 200ms से कम में खत्म = blocked/empty audio
            if (elapsed < 200 && text.length > 20) {
                settled = true;
                isSpeaking = false;
                dbg(`⚠ #${index} too fast (${elapsed}ms) → fail`);
                fallbackSpeak(text);
                return;
            }

            settled = true;
            isSpeaking = false;
            failedChunks = 0;
            dbg(`✅ #${index} played (${elapsed}ms)`);
            if (isPlaying && !isPaused) { index++; processQueue(); }
        };

        currentAudio.onerror = () => fail("onerror");

        const p = currentAudio.play();
        if (p !== undefined) {
            p.catch((err) => fail(`play:${err.name}`));
        }
    } catch (e) {
        dbg(`💥 #${index} throw: ${e.message}`);
        fallbackSpeak(text);
    }
}

function fallbackSpeak(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        return skipChunk("no TTS API");
    }

    try {
        cleanupUtter();
        const utter = new SpeechSynthesisUtterance(text);
        currentUtter = utter;

        const tag = toLocaleTag(currentLangCode);
        utter.lang = tag;
        const voice = getVoiceForLang(tag);
        if (voice) {
            utter.voice = voice;
            dbg(`🎙 #${index} voice: ${voice.name}`);
        } else {
            dbg(`⚠ #${index} no ${tag} voice, default`);
        }

        let settled = false;

        utter.onend = () => {
            if (settled) return;
            settled = true;
            isSpeaking = false;
            currentUtter = null;
            failedChunks = 0;
            dbg(`✅ #${index} utter done`);
            if (isPlaying && !isPaused) { index++; processQueue(); }
        };

        utter.onerror = (e) => {
            if (settled) return;
            settled = true;
            isSpeaking = false;
            currentUtter = null;
            dbg(`❌ #${index} utter: ${e.error || 'unknown'}`);
            skipChunk(e.error);
        };

        window.speechSynthesis.speak(utter);
    } catch (e) {
        dbg(`💥 #${index} fallback throw: ${e.message}`);
        skipChunk("fallback throw");
    }
}

function skipChunk(reason) {
    failedChunks++;
    dbg(`⏭ skip #${index}, failed=${failedChunks} (${reason || '?'})`);
    index++;

    if (failedChunks >= 3) {
        dbg(`🛑 STOP after ${failedChunks} failures`);
        stopSpeech();
        alert(
            "आवाज़ नहीं आ पा रही। कारण:\n\n" +
            "1. Google TTS temporarily blocked (rate limit) — 2-3 मिनट रुक कर try करो\n" +
            "2. Device पर हिंदी voice नहीं है — Settings → Language → Text-to-speech में install करो\n\n" +
            "नीचे हरा panel बता रहा है क्या हो रहा है।"
        );
        return;
    }

    setTimeout(() => {
        if (isPlaying && !isPaused && !isSpeaking && index < queue.length) {
            speak(queue[index]);
        }
    }, 400);
}

function processQueue() {
    if (!isPlaying || isPaused || isSpeaking) return;
    if (index >= queue.length) { stopSpeech(); return; }
    speak(queue[index]);
}

function startSpeech(btn) {
    stopSpeech();
    const bubble = btn.closest('.bubble');
    if (!bubble) return;

    const textContent = bubble.querySelector('.text-content');
    if (!textContent) return;

    const text = extractTextWithoutCode(textContent);
    if (!text || !text.trim()) return;

    currentLangCode = detectTextLanguage(text);
    dbg(`🌐 lang=${currentLangCode}, text=${text.length}c`);

    if (cachedVoices.length === 0) loadVoices();

    queue = splitText(text);
    if (queue.length === 0) return;

    dbg(`📢 ${queue.length} chunks ready`);
    index = 0;
    failedChunks = 0;
    isPlaying = true;
    isPaused = false;
    activeBtn = btn;
    btn.innerText = "Pause ⏸️";
    processQueue();
}

function pauseSpeech() {
    if (!isPlaying) return;
    isPaused = true;
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} }
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
        try { window.speechSynthesis.resume(); return; } catch (e) {}
    }
    if (currentAudio && currentAudio.paused) {
        try {
            const p = currentAudio.play();
            if (p !== undefined) p.catch(() => regenAndPlayCurrentIndex());
            return;
        } catch (e) {}
    }
    regenAndPlayCurrentIndex();
}

function regenAndPlayCurrentIndex() {
    isSpeaking = false;
    if (index < queue.length) speak(queue[index]);
    else stopSpeech();
}

function toggleSpeech(btn) {
    if (isPlaying && !isPaused) pauseSpeech();
    else if (isPlaying && isPaused) resumeSpeech();
    else startSpeech(btn);
}

function speakFromBubble(btn) {
    if (activeBtn && activeBtn !== btn) stopSpeech();
    toggleSpeech(btn);
}

// ==========================================
// 📋 COPY FUNCTIONS
// ==========================================
function showCopiedFeedback(btn) {
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerText;
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
        navigator.clipboard.writeText(text).then(() => showCopiedFeedback(btn))
            .catch(() => fallbackCopy(text, btn));
    } else {
        fallbackCopy(text, btn);
    }
}

function copyCode(btn) {
    const codeEl = btn.closest('.code-block')?.querySelector("code");
    if (!codeEl) return;
    const code = codeEl.innerText;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => showCopiedFeedback(btn))
            .catch(() => fallbackCopy(code, btn));
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