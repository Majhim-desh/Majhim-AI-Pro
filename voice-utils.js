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

// ==========================================
// 🎤 MAJHIM AI PRO — UNIVERSAL VOICE TYPING
// Safe Toggle + Cursor + Selection + Smart Spacing
// ==========================================

function startVoiceTyping() {
    const inputField = document.getElementById('user-input');
    const micBtn = document.getElementById('mic-btn');

    // 1. Browser Support Check
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!inputField) return;

    if (!SpeechRecognition) {
        alert(
            "भाई, आपके ब्राउज़र में Direct Voice Typing का सपोर्ट उपलब्ध नहीं है।\n\n" +
            "अभी Google Chrome या Microsoft Edge इस्तेमाल करें।\n" +
            "Firefox के लिए भविष्य में अलग Speech-to-Text सुविधा जोड़ेंगे।"
        );
        return;
    }

    // 2. Safe Toggle — पुरानी Recording बंद होने तक नई शुरू नहीं होगी
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            try {
                recognition.abort();
            } catch (err) {}
        }
        return;
    }

    // 3. Create a Separate Recognition Instance
    const currentRec = new SpeechRecognition();
    recognition = currentRec;

    currentRec.lang = 'hi-IN';
    currentRec.interimResults = false;
    currentRec.continuous = false;

    // 4. Common Mic Button Reset
    const resetMicButton = () => {
        if (micBtn) {
            micBtn.innerText = "🎤";
            micBtn.style.background = "#00a884";
        }
    };

    // 5. Recording Started
    currentRec.onstart = () => {
        if (recognition !== currentRec) return;

        if (micBtn) {
            micBtn.innerText = "🛑";
            micBtn.style.background = "#ff4444";
        }
    };

    // 6. Voice Result — Cursor + Selection + Smart Spacing
    currentRec.onresult = (event) => {
        if (recognition !== currentRec || !inputField) return;

        // Get the latest final result
        const resultIndex =
            typeof event.resultIndex === 'number'
                ? event.resultIndex
                : 0;

        const result = event.results[resultIndex];

        if (!result || !result[0]) return;
        if (result.isFinal === false) return;

        const transcript = result[0].transcript.trim();

        if (!transcript) return;

        const currentValue = inputField.value || "";

        // Current cursor and selected-text positions
        let start = inputField.selectionStart;
        let end = inputField.selectionEnd;

        if (typeof start !== 'number') start = currentValue.length;
        if (typeof end !== 'number') end = currentValue.length;

        const textBefore = currentValue.substring(0, start);
        const textAfter = currentValue.substring(end);

        // 7. Smart Spacing Helpers
        const isWordChar = (char) =>
            !!char && /[a-zA-Z0-9\u0900-\u097F]/.test(char);

        const isClosingPunctuation = (char) =>
            !!char && /[,;.!?।॥:)\]}»'"”’]/.test(char);

        const isWhitespace = (char) =>
            !!char && /\s/.test(char);

        let prefix = "";
        let suffix = "";

        // Add a space before spoken text when needed.
        // Also handles punctuation such as comma and full stop.
        if (textBefore.length > 0) {
            const previousChar = textBefore.slice(-1);
            const firstSpokenChar = transcript.charAt(0);

            if (!isWhitespace(previousChar)) {
                if (
                    isWordChar(previousChar) ||
                    isClosingPunctuation(previousChar)
                ) {
                    if (isWordChar(firstSpokenChar)) {
                        prefix = " ";
                    }
                }
            }
        }

        // Add a space after spoken text only when the next
        // existing character is another word character.
        if (textAfter.length > 0) {
            const nextChar = textAfter.charAt(0);
            const lastSpokenChar = transcript.slice(-1);

            if (
                !isWhitespace(nextChar) &&
                isWordChar(nextChar) &&
                isWordChar(lastSpokenChar)
            ) {
                suffix = " ";
            }
        }

        // 8. Insert at Cursor / Replace Selected Text
        const insertedText = prefix + transcript + suffix;

        inputField.value =
            textBefore + insertedText + textAfter;

        // Move cursor just after the inserted text
        const newCursorPos = start + insertedText.length;

        try {
            inputField.setSelectionRange(
                newCursorPos,
                newCursorPos
            );
        } catch (e) {}

        // 9. Notify Website About the Input Change
        try {
            inputField.dispatchEvent(
                new Event('input', { bubbles: true })
            );
        } catch (e) {
            // Compatibility fallback for older browsers
            try {
                const inputEvent = document.createEvent('Event');
                inputEvent.initEvent('input', true, false);
                inputField.dispatchEvent(inputEvent);
            } catch (err) {}
        }
    };

    // 10. Recognition Error
    currentRec.onerror = (event) => {
        if (recognition !== currentRec) return;

        resetMicButton();
        recognition = null;

        if (event.error === 'not-allowed') {
            alert("माइक की permission दो भाई!");
        } else if (
            event.error !== 'no-speech' &&
            event.error !== 'aborted'
        ) {
            alert("Voice नहीं पकड़ पाया, दोबारा try करो।");
        }
    };

    // 11. Recognition Ended
    currentRec.onend = () => {
        if (recognition !== currentRec) return;

        resetMicButton();
        recognition = null;
    };

    // 12. Start Recording
    try {
        currentRec.start();
    } catch (e) {
        if (recognition === currentRec) {
            resetMicButton();
            recognition = null;
        }
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