// 3. Voice & Utility Logic
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let currentAudio = null;

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
    if (!cleanText) return;

    // Google TTS की 200 अक्षर की लिमिट को संभालने के लिए
    // हम सिर्फ पहले 200 अक्षरों का एक ही 'मजबूत' ऑडियो बनाएंगे
    let shortText = cleanText.substring(0, 200);
    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(shortText)}&tl=hi&client=tw-ob`;

    try {
        currentAudio = new Audio(voiceUrl);
        
        // सिस्टम को भ्रमित करने के लिए कि यह एक 'Media' चल रहा है
        currentAudio.play().catch(e => {
            fallbackToSystemTTS(cleanText);
        });

    } catch (e) {
        fallbackToSystemTTS(cleanText);
    }
}

function speakFromBubble(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    speakText(text);
}

function fallbackToSystemTTS(text) {
    const s = new SpeechSynthesisUtterance(text);
    s.lang = 'hi-IN';
    // 'resume' करना ज़रूरी है वरना सिस्टम TTS कभी-कभी अटक जाता है
    window.speechSynthesis.resume(); 
    window.speechSynthesis.speak(s);
}

function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText; btn.innerText = "COPIED ✅";
        setTimeout(() => btn.innerText = old, 2000);
    });
}
