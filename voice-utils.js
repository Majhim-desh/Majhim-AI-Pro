// 🎤 MAJHIM AI PRO - FINAL HYBRID VOICE ENGINE
// Fix: No double speech, No freeze, No button glitch, Mobile stable

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition? new SpeechRecognition() : null;

// 🔒 LOCK SYSTEM - ये सबसे जरूरी है
let isCurrentlySpeaking = false;
let isPaused = false;

let currentAudio = null;
let useFallback = false;
let streamBuffer = "";
let activeBtn = null; // कौन सा बटन अभी एक्टिव है

const isMobile = /Android|iPhone/i.test(navigator.userAgent);

// 🔊 Speak Chunk - Google TTS
function speakChunk(text) {
    if (!isCurrentlySpeaking || isPaused ||!text.trim()) {
        if (!text.trim()) processStream(); // खाली है तो अगला
        return;
    }

    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    currentAudio = new Audio(voiceUrl);
    currentAudio.preload = "auto";

    currentAudio.onended = () => {
        // FIX: ended तुरंत नहीं आता, इसलिए थोड़ा वेट करो
        setTimeout(processStream, 100);
    };

    currentAudio.onerror = () => {
        useFallback = true;
        fallbackSpeak(text);
    };

    currentAudio.play().catch(() => {
        useFallback = true;
        fallbackSpeak(text);
    });
}

// 🔊 Fallback - Browser TTS
function fallbackSpeak(text) {
    if (!isCurrentlySpeaking || isPaused ||!text.trim()) {
        if (!text.trim()) processStream();
        return;
    }

    // FIX: पुरानी आवाज बंद करो पहले
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';
    utter.rate = isMobile? 0.95 : 1;

    utter.onend = () => setTimeout(processStream, 100);
    utter.onerror = () => setTimeout(processStream, 100);

    window.speechSynthesis.speak(utter);
}

// 🚀 Stream Processor - दिमाग वाला पार्ट
function processStream() {
    if (!isCurrentlySpeaking || isPaused) return;

    // FIX: Race condition का इलाज - चेक करो सच में खत्म हुआ या नहीं
    const isAudioFinished =!currentAudio || currentAudio.ended;
    const isSpeechFinished =!window.speechSynthesis.speaking;

    if (!streamBuffer.trim() && isAudioFinished && isSpeechFinished) {
        stopSpeech();
        return;
    }

    if (!streamBuffer.trim()) {
        setTimeout(processStream, 300); // अभी बज रहा है, वेट करो
        return;
    }

    // FIX: आखिरी लाइन बिना । के भी बोलेगा
    let match = streamBuffer.match(/(.+?[।!?])/);
    let sentence;

    if (match) {
        sentence = match[1];
        streamBuffer = streamBuffer.slice(sentence.length);
    } else {
        sentence = streamBuffer; // बचा हुआ सब बोल दो
        streamBuffer = "";
    }

    if (useFallback) fallbackSpeak(sentence);
    else speakChunk(sentence);
}

// 🛑 STOP - सब बंद, सब रीसेट
function stopSpeech() {
    isCurrentlySpeaking = false;
    isPaused = false;
    streamBuffer = "";

    window.speechSynthesis.cancel();

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }

    // FIX: सिर्फ एक्टिव बटन रीसेट करो, सब नहीं
    if (activeBtn) {
        activeBtn.innerText = "Listen 🔊";
        activeBtn = null;
    }
    useFallback = false;
}

// ⏸️ Pause
function pauseSpeech() {
    if (!isCurrentlySpeaking || isPaused) return;
    isPaused = true;

    if (currentAudio) currentAudio.pause();
    window.speechSynthesis.pause();

    if (activeBtn) activeBtn.innerText = "Resume ▶️";
}

// ▶️ Resume
function resumeSpeech() {
    if (!isCurrentlySpeaking ||!isPaused) return;
    isPaused = false;

    if (activeBtn) activeBtn.innerText = "Pause ⏸️";

    if (useFallback) {
        window.speechSynthesis.resume();
    } else if (currentAudio) {
        currentAudio.play().catch(() => processStream());
    }

    // अगर कुछ नहीं बज रहा तो प्रोसेस फिर से शुरू करो
    if (!window.speechSynthesis.speaking && (!currentAudio || currentAudio.paused)) {
        processStream();
    }
}

// 🔁 MAIN TOGGLE - सिर्फ यही बटन से कनेक्ट करना है
function toggleSpeech(btn) {
    // FIX: Lock - अगर पहले से बज रहा है और दूसरा बटन दबा तो पहले वाला बंद करो
    if (isCurrentlySpeaking && activeBtn!== btn) {
        stopSpeech();
    }

    // केस 1: कुछ नहीं बज रहा -> शुरू करो
    if (!isCurrentlySpeaking) {
        const text = btn.closest('.bubble').querySelector('.text-content').innerText;

        isCurrentlySpeaking = true;
        isPaused = false;
        useFallback = false;
        activeBtn = btn; // इस बटन को लॉक कर दिया

        streamBuffer = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");
        btn.innerText = "Pause ⏸️";
        processStream();

    // केस 2: बज रहा है -> Pause या Resume करो
    } else {
        if (isPaused) {
            resumeSpeech();
        } else {
            pauseSpeech();
        }
    }
}

// 🎯 Button Hook - HTML में onclick="speakFromBubble(this)" यही रहेगा
function speakFromBubble(btn) {
    toggleSpeech(btn);
}

// 📋 COPY FUNCTIONS - ये सेम हैं
function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText;
        btn.innerText = "COPIED ✅";
        setTimeout(() => { btn.innerText = old; }, 2000);
    }).catch(err => { console.error("Copy failed:", err); });
}

function copyCode(btn) {
    const code = btn.parentElement.querySelector("code").innerText;
    navigator.clipboard.writeText(code).then(() => {
        const old = btn.innerText;
        btn.innerText = "Copied ✅";
        setTimeout(() => { btn.innerText = old; }, 2000);
    }).catch(err => { console.error("Code copy failed:", err); });
}
