// 2. Chat & UI Logic
const chatBox = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');

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
    
    let htmlContent = text;
    let rawTextForVoice = text; // वॉइस इंजन के लिए साफ टेक्स्ट

    if (sender === 'bot') {        
        // कोड ब्लॉक्स को सजाने के लिए
        htmlContent = text.replace(/```(\w+)?([\s\S]*?)```/g, (m, lang, code) => {
            const cleanCode = code
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .trim();

            return `
            <div class="code-block">
                <div class="code-header">
                    <span>${lang || 'code'}</span>
                    <button onclick="copyCode(this)">Copy 💻</button>
                </div>
                <pre><code class="language-${lang || 'javascript'}">${cleanCode}</code></pre>
            </div>`;
        });
        
        // वॉइस इंजन के लिए: कोड हटाकर सिर्फ "कोड ब्लॉक" शब्द रखें
        rawTextForVoice = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");
    }

    const buttons = sender === 'bot' ? `
        <div class="btn-group" style="margin-top:10px; display:flex; gap:10px;">
            <button class="action-btn" onclick="speakFromBubble(this)" style="cursor:pointer; background:#00a884; color:white; border:none; padding:5px 10px; border-radius:5px;">Listen 🔊</button>
            <button class="action-btn" onclick="copyToClipboard(this)" style="cursor:pointer; background:#444; color:white; border:none; padding:5px 10px; border-radius:5px;">Copy Text</button>
        </div>` : '';

    // 🔥 STRUCTURE: text-content में सिर्फ टेक्स्ट जाए और HTML अलग रहे
    div.innerHTML = `
        <div class="bubble">
            <div class="text-content">${htmlContent}</div>
            ${buttons}
        </div>`;

    chatBox.appendChild(div);

    if (sender === 'bot') {
        setTimeout(() => Prism.highlightAllUnder(div), 100);
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}

// ✅ 1. AI API Call (Groq Llama 3)
async function callChatGPT(query) {
    const typingUI = document.getElementById('typing-ui');
    if (typingUI) typingUI.style.display = 'inline';

    try {
        let key = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (!key && attempts < maxAttempts) {
            key = await getAIKey(); 
            if (!key) {
                attempts++;
                if (attempts < maxAttempts) await new Promise(res => setTimeout(res, 1500)); 
            }
        }

        if (!key) {
            addBubble("भाई, API Key लोड नहीं हो पाई। थोड़ा इंतज़ार करके पेज रिफ्रेश करो।", 'bot');
            if (typingUI) typingUI.style.display = 'none';
            return;
        }

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${key}` 
            },
            body: JSON.stringify({ 
                model: "llama-3.1-8b-instant", 
                messages: [{role: "user", content: query}] 
            })
        });

        const data = await res.json();
        if (data.choices && data.choices[0]) {
            addBubble(data.choices[0].message.content, 'bot');
        } else {
            addBubble("AI से जवाब नहीं मिल पाया, दोबारा कोशिश करें।", 'bot');
        }
    } catch (e) { 
        console.error("Chat Error:", e);
        addBubble("नेटवर्क में कुछ गड़बड़ है भाई, इंटरनेट चेक करो!", 'bot');
    }
    if (typingUI) typingUI.style.display = 'none';
}

// ✅ 2. Image Generator
async function generateAIImage(prompt) {
    addBubble("🎨 Drawing...", 'bot');
    const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=512&height=512&seed=${Math.random()}`;
    addBubble(`<img src="${url}" style="width:100%; border-radius:10px; margin-top:10px;" alt="AI Generated">`, 'bot');
}

// ✅ 3. Enter Key Support
userInput.addEventListener("keypress", (e) => { 
    if (e.key === "Enter") sendMsg();
});
