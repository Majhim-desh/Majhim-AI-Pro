// 3. Voice & Utility Logic
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let currentAudio = null;
let speechQueue = [];
let queueIndex = 0;

function startVoiceTyping() {
    if (!recognition) { alert("Voice typing not supported."); return; }
    let oldText = userInput.value.trim();
    recognition.lang = 'hi-IN';
    recognition.start();
    document.getElementById('mic-btn').style.background = "#ea0038";
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = oldText !== "" ? oldText + " " + transcript : transcript;
    };

    recognition.onspeechend = () => { 
        recognition.stop(); 
        document.getElementById('mic-btn').style.background = "#3b4a54"; 
    };

    recognition.onerror = () => { document.getElementById('mic-btn').style.background = "#3b4a54"; };
}

async function speakText(text) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    window.speechSynthesis.cancel();

    let cleanText = text.replace(/```[\s\S]*?```/g, "Code Block").trim();
    
    speechQueue = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    if (speechQueue.length === 0 && cleanText.length > 0) speechQueue = [cleanText];
    
    queueIndex = 0;
    playNextChunk();
}

// यह नया Fetch वाला फंक्शन है जो "झाड़ू बटन" से ऑडियो को बचाएगा
async function playNextChunk() {
    if (queueIndex >= speechQueue.length) {
        currentAudio = null;
        return;
    }
    
    let chunk = speechQueue[queueIndex].trim();
    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=hi&client=tw-ob`;

    try {
        const response = await fetch(voiceUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        currentAudio = new Audio(blobUrl);
        
        currentAudio.onended = () => {
            URL.revokeObjectURL(blobUrl); // मेमोरी साफ़ करने के लिए
            queueIndex++;
            playNextChunk();
        };

        currentAudio.play();
    } catch (e) {
        console.log("Blob failed, falling back to system TTS");
        fallbackToSystemTTS(chunk);
        queueIndex++;
        playNextChunk();
    }
}

function speakFromBubble(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    speakText(text);
}

function fallbackToSystemTTS(text) {
    const s = new SpeechSynthesisUtterance(text);
    s.lang = 'hi-IN';
    window.speechSynthesis.speak(s);
}

function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText; btn.innerText = "COPIED ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}
