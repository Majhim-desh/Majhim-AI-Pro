// 🎤 Majhim AI Pro - FINAL HYBRID STREAMING VOICE ENGINE (Ultra-Smooth Edition)

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let useFallback = false;

let streamBuffer = "";
let isStreaming = false;
let resumeInterval = null;
let lastBtn = null; 

// 🛡️ Resume System (MIUI/Android Cleaner Protection)
function startResumeSystem() {
    if (resumeInterval) clearInterval(resumeInterval);
    resumeInterval = setInterval(() => {
        if (isPlaying && !isPaused && currentAudio && currentAudio.paused && !currentAudio.ended) {
            currentAudio.play().catch(() => {});
        }
    }, 1000);
}

// 🔊 Speak one chunk (Google TTS with Preload)
function speakChunk(text) {
    if (!isPlaying || isPaused) return;

    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    currentAudio = new Audio(voiceUrl);
    
    // 🔥 Preload: ताकि आवाज़ के बीच गैप न आए
    currentAudio.preload = "auto"; 

    currentAudio.onended = () => {
        processStream();
    };

    currentAudio.onerror = () => {
        useFallback = true;
        fallbackSpeak(text);
    };

    currentAudio.play()
        .then(() => startResumeSystem())
        .catch(() => {
            useFallback = true;
            fallbackSpeak(text);
        });
}

// 🔊 Fallback Voice (System Speech Synthesis)
function fallbackSpeak(text) {
    if (!isPlaying || isPaused) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';

    utter.onend = () => {
        processStream();
    };

    window.speechSynthesis.speak(utter);
}

// 🚀 STREAM PROCESSOR (Smart Splicing + Auto-Reset Logic)
function processStream() {
    if (!isPlaying || isPaused) return;

    // 🛑 अगर बफर खाली है
    if (!streamBuffer.trim()) {
        isStreaming = false;
        
        // ⏳ 600ms का इंतज़ार ताकि आखिरी शब्द के बाद बटन स्मूथली रिसेट हो
        setTimeout(() => {
            if (!streamBuffer.trim() && (!currentAudio || currentAudio.ended)) {
                stopSpeech(); 
            }
        }, 600);
        return;
    }

    // RegEx: वाक्य को पूर्ण विराम (।) या सवालिया निशान (?) पर तोड़ें
    const match = streamBuffer.match(/(.+?[।!?])/);

    if (match) {
        const sentence = match[1];
        // replace की जगह slice का इस्तेमाल (Fast & Accurate)
        streamBuffer = streamBuffer.slice(sentence.length);

        if (useFallback) {
            fallbackSpeak(sentence);
        } else {
            speakChunk(sentence);
        }
    } else {
        // अगर वाक्य अभी अधूरा है, तो 300ms बाद फिर चेक करें
        setTimeout(processStream, 300); 
    }
}

// 🎯 STREAM START
function streamSpeak(text) {
    streamBuffer += " " + text;

    if (!isStreaming) {
        isStreaming = true;
        processStream();
    }
}

// 🛑 STOP ALL (Full Cleanup + Button Reset Fix)
function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    isStreaming = false;
    streamBuffer = "";

    window.speechSynthesis.cancel();

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }

    if (resumeInterval) {
        clearInterval(resumeInterval);
        resumeInterval = null;
    }

    // ✅ बटन को वापस Listen 🔊 बनाना
    document.querySelectorAll('.action-btn').forEach(btn => {
        if (btn.innerText.includes("Pause") || btn.innerText.includes("Resume")) {
            btn.innerText = "Listen 🔊";
        }
    });
}

// ⏸️ Pause Logic
function pauseSpeech(btn) {
    isPaused = true;
    if (currentAudio) currentAudio.pause();
    window.speechSynthesis.pause();
    btn.innerText = "Resume ▶️";
}

// ▶️ Resume Logic
function resumeSpeech(btn) {
    isPaused = false;
    btn.innerText = "Pause ⏸️";

    if (useFallback) {
        window.speechSynthesis.resume();
    } else {
        if (currentAudio) {
            currentAudio.play().catch(() => processStream());
        } else {
            processStream();
        }
    }
}

// 🔁 TOGGLE Controller
function toggleSpeech(btn) {
    if (!isPlaying) {
        const text = btn.closest('.bubble').querySelector('.text-content').innerText;
        isPlaying = true;
        isPaused = false;
        useFallback = false;
        streamSpeak(text);
        btn.innerText = "Pause ⏸️";
        return;
    }

    if (isPlaying && !isPaused) {
        pauseSpeech(btn);
    } else {
        resumeSpeech(btn);
    }
}

// 🎯 MAIN BUTTON HOOK
function speakFromBubble(btn) {
    if (lastBtn && lastBtn !== btn) {
        stopSpeech(); 
    }
    lastBtn = btn;
    toggleSpeech(btn);
}

// 🎤 MIC: Voice Typing
function startVoiceTyping() {
    if (!recognition) {
        alert("माफ़ करना, वॉइस टाइपिंग सपोर्ट नहीं है।");
        return;
    }

    recognition.lang = 'hi-IN';
    recognition.start();

    const micBtn = document.getElementById('mic-btn');
    micBtn.style.background = "#ea0038";

    recognition.onresult = (event) => {
        const input = document.getElementById('user-input');
        input.value += event.results[0][0].transcript;
    };

    recognition.onspeechend = () => {
        recognition.stop();
        micBtn.style.background = "#00a884";
    };

    recognition.onerror = () => {
        micBtn.style.background = "#00a884";
    };
}

// 📋 COPY FUNCTIONS
function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText;
        btn.innerText = "COPIED ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}

function copyCode(btn) {
    const code = btn.parentElement.querySelector("code").innerText;
    navigator.clipboard.writeText(code).then(() => {
        const old = btn.innerText;
        btn.innerText = "Copied ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}
