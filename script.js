// 1. Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCL4YKtPYxxhLoGwjw7A_81WWYBsOQZmoQ",
    authDomain: "majhim-ai.firebaseapp.com",
    projectId: "majhim-ai",
    storageBucket: "majhim-ai.firebasestorage.app",
    messagingSenderId: "361749678090",
    appId: "1:361749678090:web:ed1668151fbe935fecb7f3"
};
firebase.initializeApp(firebaseConfig);
const remoteConfig = firebase.remoteConfig();
remoteConfig.settings.minimumFetchIntervalMillis = 0;

async function getAIKey() {
    try { await remoteConfig.fetchAndActivate(); return remoteConfig.getValue('OPENAI_API_KEY').asString(); } catch (err) { return null; }
}

const chatBox = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');

// 2. Hybrid Voice Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

function startVoiceTyping() {
    if (!recognition) { alert("Voice typing not supported."); return; }
    let oldText = userInput.value.trim();
    recognition.lang = 'hi-IN';
    recognition.start();
    document.getElementById('mic-btn').style.background = "#ea0038";
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = oldText !== "" ? oldText + " " + transcript : transcript;
        document.getElementById('mic-btn').style.background = "#3b4a54";
    };
    recognition.onspeechend = () => { recognition.stop(); document.getElementById('mic-btn').style.background = "#3b4a54"; };
    recognition.onerror = () => { document.getElementById('mic-btn').style.background = "#3b4a54"; };
}

// 3. UI and AI Logic
async function sendMsg() {
    const text = userInput.value.trim();
    if (!text) return;
    addBubble(text, 'user');
    userInput.value = '';
    if (text.startsWith("/image ")) generateAIImage(text.replace("/image ", ""));
    else callChatGPT(text);
}

function addBubble(text, sender) {
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    let content = text;
    if (sender === 'bot') {
        content = text.replace(/```(\w+)?([\s\S]*?)```/g, (m, lang, code) => `<pre><code class="language-${lang || 'javascript'}">${code.trim()}</code></pre>`);
    }
    const buttons = sender === 'bot' ? `
        <div class="btn-group">
            <span class="action-btn" onclick="speakFromBubble(this)">Listen 🔊</span>
            <span class="action-btn" onclick="copyToClipboard(this)">Copy Text</span>
        </div>` : '';
    div.innerHTML = `<div class="bubble"><div class="text-content">${content}</div>${buttons}</div>`;
    chatBox.appendChild(div);
    if (sender === 'bot') Prism.highlightAllUnder(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function callChatGPT(query) {
    document.getElementById('typing-ui').style.display = 'inline';
    const key = await getAIKey();
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{role: "user", content: query}] })
        });
        const data = await res.json();
        const reply = data.choices[0].message.content;
        addBubble(reply, 'bot');
        speakText(reply);
    } catch (e) { console.error(e); }
    document.getElementById('typing-ui').style.display = 'none';
}

async function generateAIImage(prompt) {
    addBubble("🎨 Drawing...", 'bot');
    const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=512&height=512&seed=${Math.random()}`;
    addBubble(`<img src="${url}">`, 'bot');
}

// 4. SMART CLOUD TTS (बिना रुके पूरा बोलने वाला)
let currentAudio = null;
let speechQueue = [];
let queueIndex = 0;

function speakText(text) {
    // पुरानी आवाज़ रोकें और कतार (Queue) साफ़ करें
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    window.speechSynthesis.cancel();
    speechQueue = [];
    queueIndex = 0;

    // 1. कोड ब्लॉक्स हटाएँ
    let cleanText = text.replace(/```[\s\S]*?```/g, "Code Block");

    // 2. टेक्स्ट को छोटे टुकड़ों में तोड़ें (बिंदु '.', '?' या '!' के आधार पर)
    // ताकि Google API की 200 अक्षर वाली लिमिट न टूटे
    speechQueue = cleanText.match(/[^.!?]+[.!?]?/g) || [cleanText];

    // बोलना शुरू करें
    playNextChunk();
}

function playNextChunk() {
    if (queueIndex >= speechQueue.length) return; // सब बोल दिया

    let chunk = speechQueue[queueIndex].trim();
    if (chunk.length < 2) { queueIndex++; playNextChunk(); return; }

    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=hi&client=tw-ob`;

    currentAudio = new Audio(voiceUrl);
    
    // जब एक टुकड़ा खत्म हो, तब अगला शुरू करें
    currentAudio.onended = () => {
        queueIndex++;
        playNextChunk();
    };

    currentAudio.play().catch(e => {
        console.log("Cloud failed, switching to System...");
        fallbackToSystemTTS(chunk);
    });
}

// 5. Copy Logic
function copyToClipboard(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => showStatus(btn, "COPIED ✅")).catch(() => fallbackCopy(text, btn));
    } else { fallbackCopy(text, btn); }
}

function fallbackCopy(text, btn) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showStatus(btn, "COPIED ✅");
}

function showStatus(btn, msg) {
    const old = btn.innerText; btn.innerText = msg;
    setTimeout(() => btn.innerText = old, 2000);
}

userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMsg(); });
// बटन से आवाज़ शुरू करने के लिए (यह आपके कोड में मिसिंग था)
function speakFromBubble(btn) {
    const text = btn.closest('.bubble').querySelector('.text-content').innerText;
    speakText(text);
}

// अगर क्लाउड काम न करे तो सिस्टम की आवाज़ इस्तेमाल करें
function fallbackToSystemTTS(text) {
    const s = new SpeechSynthesisUtterance(text);
    s.lang = 'hi-IN';
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(s);
}
