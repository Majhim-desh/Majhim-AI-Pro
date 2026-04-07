// 🔥 FINAL HYBRID VOICE ENGINE (STABLE)

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

let currentAudio = null;
let speechQueue = [];
let queueIndex = 0;
let useFallback = false;

// 🚀 MAIN PLAYER
function playNextChunk() {
    if (queueIndex >= speechQueue.length) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = "none";
        }
        return;
    }

    let chunk = speechQueue[queueIndex].trim();
    if (!chunk) {
        queueIndex++;
        playNextChunk();
        return;
    }

    // 🔁 अगर fallback mode है
    if (useFallback) {
        fallbackSpeak(chunk);
        return;
    }

    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=hi&client=tw-ob`;

    // 🧹 पुराने audio को साफ करो
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    currentAudio = new Audio(voiceUrl);
    currentAudio.preload = "auto";

    currentAudio.onended = () => {
        queueIndex++;
        playNextChunk();
    };

    currentAudio.onerror = () => {
        console.log("🔁 Switching to fallback voice");
        useFallback = true;
        fallbackSpeak(chunk);
    };

    currentAudio.play().catch(() => {
        useFallback = true;
        fallbackSpeak(chunk);
    });
}

// 🔊 FALLBACK (SYSTEM VOICE)
function fallbackSpeak(text) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';

    utter.onend = () => {
        queueIndex++;
        playNextChunk();
    };

    utter.onerror = () => {
        queueIndex++;
        playNextChunk();
    };

    window.speechSynthesis.speak(utter);
}

// 🎯 START SPEAKING
function speakText(text) {
    // 🛑 पहले सब बंद करो
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }

    window.speechSynthesis.cancel();

    // reset
    speechQueue = [];
    queueIndex = 0;
    useFallback = false;

    let cleanText = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक").trim();
    if (!cleanText) return;

    speechQueue = cleanText
        .split(/(?<=[।!?])\s+/)
        .filter(s => s.trim().length > 0);

    if (speechQueue.length === 0) {
        speechQueue = [cleanText];
    }

    playNextChunk();
}

// 🔘 BUTTON CLICK
function speakFromBubble(btn) {
    const text = btn.closest('.bubble')
        .querySelector('.text-content').innerText;

    speakText(text);
}

// 🎤 MIC
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

    recognition.onerror = () => {
        document.getElementById('mic-btn').style.background = "#3b4a54";
    };
}

// 📋 COPY
function copyToClipboard(btn) {
    const text = btn.closest('.bubble')
        .querySelector('.text-content').innerText;

    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText;
        btn.innerText = "COPIED ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}
