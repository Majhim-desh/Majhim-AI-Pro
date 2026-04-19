// 🎤 ULTIMATE STABLE ENGINE (No More Logic Fails)

let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let isFinished = false;
let isCurrentlySpeaking = false; 

let streamBuffer = "";
let isStreaming = false;
let lastBtn = null;
let resumeInterval = null;

// 1. 🛑 COMPLETE SYSTEM RESET
function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    isFinished = false;
    isCurrentlySpeaking = false;
    streamBuffer = "";

    if (resumeInterval) { clearInterval(resumeInterval); resumeInterval = null; }

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }

    // सभी बटनों को वापस अपनी असल हालत में लाओ
    document.querySelectorAll('.action-btn').forEach(btn => {
        if (btn.innerText.includes("Pause") || btn.innerText.includes("Resume")) {
            btn.innerText = "Listen 🔊";
        }
    });
}

// 2. 🚀 THE PROCESSOR (Wait & Speak Logic)
function processStream() {
    if (!isPlaying || isPaused || isCurrentlySpeaking) return;

    if (!streamBuffer.trim()) {
        isStreaming = false;
        // अगर सब खत्म हो गया तो बटन रिसेट करो
        setTimeout(() => {
            if (!streamBuffer.trim() && (!currentAudio || currentAudio.ended)) {
                finishSpeech();
            }
        }, 800);
        return;
    }

    // वाक्यों को काटना (। ! ?)
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
        speakChunk(sentence);
    } else {
        setTimeout(processStream, 300);
    }
}

// 3. 🔊 THE VOICE ENGINE (Google TTS - Most Stable)
function speakChunk(text) {
    isCurrentlySpeaking = true;
    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;

    if (currentAudio) { currentAudio.src = ""; }
    currentAudio = new Audio(voiceUrl);

    currentAudio.onended = () => {
        isCurrentlySpeaking = false;
        processStream();
    };

    currentAudio.onerror = () => {
        console.error("Audio Load Error");
        isCurrentlySpeaking = false;
        processStream(); // एरर आए तो अगले वाक्य पर जाओ, रुको मत
    };

    currentAudio.play().then(() => {
        // मोबाइल के लिए पहरेदार (Interval)
        if (!resumeInterval) {
            resumeInterval = setInterval(() => {
                if (isPlaying && !isPaused && currentAudio && currentAudio.paused && !currentAudio.ended) {
                    currentAudio.play().catch(()=>{});
                }
            }, 1500);
        }
    }).catch(() => {
        isCurrentlySpeaking = false;
        processStream();
    });
}

// 4. 🏁 FINISH SYSTEM
function finishSpeech() {
    isPlaying = false;
    isFinished = true;
    if (resumeInterval) { clearInterval(resumeInterval); resumeInterval = null; }
    if (lastBtn && (lastBtn.innerText.includes("Pause") || lastBtn.innerText.includes("Resume"))) {
        lastBtn.innerText = "Listen 🔊";
    }
}

// 5. ⏸️ PAUSE/RESUME
function pauseSpeech(btn) {
    isPaused = true;
    if (currentAudio) currentAudio.pause();
    btn.innerText = "Resume ▶️";
}

function resumeSpeech(btn) {
    isPaused = false;
    btn.innerText = "Pause ⏸️";
    if (currentAudio) currentAudio.play().catch(() => processStream());
    else processStream();
}

// 6. 🔁 THE BRAIN (Toggle Control)
function toggleSpeech(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;

    if (!isPlaying || isFinished) {
        stopSpeech();
        isPlaying = true;
        isFinished = false;
        isStreaming = true;
        streamBuffer = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक"); // कोड को बोलने से हटाओ
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
