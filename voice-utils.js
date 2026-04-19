// 🎤 ULTIMATE VOICE ENGINE (Zero-Ghost Resume Edition)

let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let isFinished = false;
let isCurrentlySpeaking = false; 

let streamBuffer = "";
let isStreaming = false;
let lastBtn = null;
let useFallback = false;

let resumeInterval = null; // 🛡️ Global Timer Reference

// 🛡️ 1. SAFE RESUME SYSTEM (No Multiple Intervals)
function startResumeSystem() {
    // अगर पहले से कोई टाइमर है, तो उसे ख़त्म करो
    if (resumeInterval) {
        clearInterval(resumeInterval);
    }

    resumeInterval = setInterval(() => {
        if (isPlaying && !isPaused && currentAudio && currentAudio.paused && !currentAudio.ended) {
            currentAudio.play().catch(() => {});
        }
    }, 1200);
}

// 🛑 2. FULL RESET (All Cleanup)
function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    isFinished = false;
    isCurrentlySpeaking = false;
    isStreaming = false;
    streamBuffer = "";

    // 🛡️ Ghost Interval को मारो
    if (resumeInterval) {
        clearInterval(resumeInterval);
        resumeInterval = null;
    }

    if (window.speechSynthesis) window.speechSynthesis.cancel();

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.src = "";
        currentAudio = null;
    }

    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.innerText = "Listen 🔊";
    });
}

// 🚀 3. PROCESSOR (Lock + Last Line Fix)
function processStream() {
    if (!isPlaying || isPaused || isCurrentlySpeaking) return;

    if (!streamBuffer.trim()) {
        isStreaming = false;
        setTimeout(() => {
            if (!streamBuffer.trim() && (!currentAudio || currentAudio.ended)) {
                isFinished = true;
                isPlaying = false;
                if (lastBtn) lastBtn.innerText = "Listen 🔊";
                
                // काम खत्म तो पहरेदार को भी हटाओ
                if (resumeInterval) {
                    clearInterval(resumeInterval);
                    resumeInterval = null;
                }
            }
        }, 700);
        return;
    }

    let match = streamBuffer.match(/(.+?[।!?])/);
    let sentence = "";

    if (match) {
        sentence = match[1];
        streamBuffer = streamBuffer.slice(sentence.length);
    } else if (!isStreaming) { 
        sentence = streamBuffer.trim();
        streamBuffer = "";
    }

    if (sentence) {
        isCurrentlySpeaking = true; 
        if (useFallback) fallbackSpeak(sentence);
        else speakChunk(sentence);
    } else {
        setTimeout(processStream, 250);
    }
}

// 🔊 4. CHUNK ENGINE (Interval Trigger)
function speakChunk(text) {
    if (!isPlaying || isPaused) {
        isCurrentlySpeaking = false; 
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
        isCurrentlySpeaking = false; 
        processStream();
    };

    currentAudio.onerror = () => {
        isCurrentlySpeaking = false; 
        useFallback = true;
        fallbackSpeak(text);
    };

    currentAudio.play()
        .then(() => {
            // ✅ सिर्फ यहाँ से पहरेदार शुरू होगा
            startResumeSystem();
        })
        .catch(() => {
            isCurrentlySpeaking = false; 
            useFallback = true;
            fallbackSpeak(text);
        });
}

// 🔊 5. FALLBACK
function fallbackSpeak(text) {
    if (!isPlaying || isPaused) {
        isCurrentlySpeaking = false;
        return;
    }
    window.speechSynthesis.cancel(); 
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';
    utter.onend = () => {
        isCurrentlySpeaking = false; 
        processStream();
    };
    window.speechSynthesis.speak(utter);
}

// ▶️ 6. RESUME
function resumeSpeech(btn) {
    isPaused = false;
    btn.innerText = "Pause ⏸️";
    isCurrentlySpeaking = false; 
    
    if (currentAudio) {
        currentAudio.play().then(() => startResumeSystem()).catch(() => processStream());
    } else {
        processStream();
    }
}

// ⏸️ 7. PAUSE
function pauseSpeech(btn) {
    isPaused = true;
    if (currentAudio) currentAudio.pause();
    if (window.speechSynthesis) window.speechSynthesis.pause();
    btn.innerText = "Resume ▶️";
    
    // पॉज़ होने पर टाइमर बंद करो ताकि बैटरी न जले
    if (resumeInterval) {
        clearInterval(resumeInterval);
        resumeInterval = null;
    }
}

// 🔁 8. MAIN TOGGLE
function toggleSpeech(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;

    if (!isPlaying || isFinished) {
        stopSpeech();
        isPlaying = true;
        isPaused = false;
        isFinished = false;
        isStreaming = true;
        streamBuffer = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");
        processStream();
        btn.innerText = "Pause ⏸️";
    } 
    else if (isPlaying && !isPaused) {
        pauseSpeech(btn);
    } 
    else if (isPaused) {
        resumeSpeech(btn);
    }
}

function speakFromBubble(btn) {
    if (lastBtn && lastBtn !== btn) stopSpeech();
    lastBtn = btn;
    toggleSpeech(btn);
}
