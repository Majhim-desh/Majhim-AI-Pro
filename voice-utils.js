// 3. Voice & Utility Logic (Ultrafast Pro Version)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let currentAudio = null;
let speechQueue = [];
let queueIndex = 0;

function playNextChunk() {
    if (queueIndex >= speechQueue.length) {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "none";
        return;
    }
    
    let chunk = speechQueue[queueIndex].trim();
    // Fetch हटाकर सीधा URL इस्तेमाल करेंगे ताकि देरी न हो
    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=hi&client=tw-ob`;

    currentAudio = new Audio(voiceUrl);

    // मीडिया सेशन को तुरंत चालू करें ताकि सिस्टम इसे 'Music' समझे
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Majhim AI Pro बोल रहा है...',
            artist: 'Majhim Desh',
            album: 'AI Voice Service'
        });
        navigator.mediaSession.playbackState = "playing";
    }

    currentAudio.onended = () => {
        queueIndex++;
        playNextChunk();
    };

    currentAudio.onerror = () => {
        fallbackToSystemTTS(chunk);
        queueIndex++;
        playNextChunk();
    };

    // 'play' को तुरंत कॉल करें
    currentAudio.play().catch(e => {
        console.log("Auto-play blocked, using fallback");
        fallbackToSystemTTS(chunk);
    });
}

function speakText(text) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    window.speechSynthesis.cancel();
    
    let cleanText = text.replace(/```[\s\S]*?```/g, "Code Block").trim();
    
    // टुकड़े थोड़े बड़े रखें ताकि 'Next Chunk' का लोड कम पड़े
    speechQueue = cleanText.split(/(?<=[।!?])\s+/).filter(s => s.trim().length > 0);
    if (speechQueue.length === 0 && cleanText.length > 0) speechQueue = [cleanText];
    
    queueIndex = 0;
    playNextChunk();
}

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
}

function fallbackToSystemTTS(text) {
    const s = new SpeechSynthesisUtterance(text);
    s.lang = 'hi-IN';
    window.speechSynthesis.speak(s);
}

function speakFromBubble(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    speakText(text);
}

function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText; btn.innerText = "COPIED ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}
