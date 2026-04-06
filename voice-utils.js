// 3. Voice & Utility Logic (The Final Perfection Version)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let currentAudio = null;
let speechQueue = [];
let queueIndex = 0;
let isSpeaking = false; 
let useFallback = false; 

function playNextChunk() {
    // 🏁 Safety Exit: अगर कतार खत्म हो गई है
    if (queueIndex >= speechQueue.length) {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "none";
        isSpeaking = false; 
        useFallback = false; 
        return;
    }

    let chunk = speechQueue[queueIndex].trim();
    if (!chunk) {
        queueIndex++;
        playNextChunk();
        return;
    }

    // --- 🔊 HYBRID LOGIC ---
    if (useFallback) {
        fallbackSpeak(chunk);
        return;
    }

    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=hi&client=tw-ob`;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    currentAudio = new Audio(voiceUrl);
    currentAudio.preload = "auto";

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Majhim AI Pro बोल रहा है...',
            artist: 'Majhim Desh'
        });
        navigator.mediaSession.playbackState = "playing";
    }

    // 🔧 FIX 2: onended में safety reset
    currentAudio.onended = () => {
        queueIndex++;
        if (queueIndex >= speechQueue.length) isSpeaking = false; 
        playNextChunk();
    };

    currentAudio.onerror = () => {
        console.log("🔁 Switching to System Voice");
        useFallback = true; 
        fallbackSpeak(chunk);
    };

    currentAudio.play().catch(() => {
        useFallback = true;
        fallbackSpeak(chunk);
    });
}

function fallbackSpeak(text) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';

    utter.onend = () => {
        queueIndex++;
        if (queueIndex >= speechQueue.length) isSpeaking = false; 
        playNextChunk();
    };

    // 🔧 FIX 1: rare infinite loop रोकना
    utter.onerror = () => {
        queueIndex++;
        if (queueIndex >= speechQueue.length) isSpeaking = false; 
        playNextChunk();
    };

    window.speechSynthesis.speak(utter);
}

function speakText(text) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }
    window.speechSynthesis.cancel();
    
    speechQueue = [];
    queueIndex = 0;
    useFallback = false; 

    // कोड ब्लॉक्स को बोलने से बचाएं
    let cleanText = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक").trim();
    if (!cleanText) {
        isSpeaking = false;
        return;
    }

    speechQueue = cleanText.split(/(?<=[।!?])\s+/).filter(s => s.trim().length > 0);
    if (speechQueue.length === 0) speechQueue = [cleanText];

    isSpeaking = true; 
    playNextChunk();
}

function speakFromBubble(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    speakText(text);
}

// --- Mic & Copy Utilities ---
function startVoiceTyping() {
    if (!recognition) { alert("Voice typing not supported."); return; }
    recognition.lang = 'hi-IN';
    recognition.start();
    document.getElementById('mic-btn').style.background = "#ea0038";
    recognition.onresult = (event) => {
        userInput.value += event.results[0][0].transcript;
    };
    recognition.onspeechend = () => {
        recognition.stop();
        document.getElementById('mic-btn').style.background = "#3b4a54";
    };
    recognition.onerror = () => { document.getElementById('mic-btn').style.background = "#3b4a54"; };
}

function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText; btn.innerText = "COPIED ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}
