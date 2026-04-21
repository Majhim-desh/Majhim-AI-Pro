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
    let content = text;
    
    if (sender === 'bot') {        
       content = text.replace(/```(\w+)?([\s\S]*?)```/g, (m, lang, code) => {
   const cleanCode = code
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
    return `
    <div class="code-block">
        <button class="copy-code-btn" onclick="copyCode(this)">Copy Code</button>
        <pre><code class="language-${lang || 'javascript'}">${cleanCode}</code></pre>
    </div>`;
});
    }

    const buttons = sender === 'bot' ? `
        <div class="btn-group">
            <span class="action-btn" onclick="speakFromBubble(this)">Listen 🔊</span>
            <span class="action-btn" onclick="copyToClipboard(this)">Copy Text</span>
        </div>` : '';

    div.innerHTML = `<div class="bubble"><div class="text-content">${content}</div>${buttons}</div>`;
    chatBox.appendChild(div);

    if (sender === 'bot') {
        setTimeout(() => Prism.highlightAllUnder(div), 100);
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ✅ 1. AI को मैसेज भेजने का फंक्शन (With Retry & Wait Logic)
async function callChatGPT(query) {
    const typingUI = document.getElementById('typing-ui');
    if (typingUI) typingUI.style.display = 'inline';

    try {
        let key = null;
        let attempts = 0;
        const maxAttempts = 3;

        // 🔄 RETRY LOOP: जब तक चाबी न मिले, कोशिश करते रहो
        while (!key && attempts < maxAttempts) {
            console.log(`Key fetch attempt: ${attempts + 1}`);
            key = await getAIKey(); 
            
            if (!key) {
                attempts++;
                if (attempts < maxAttempts) {
                    // अगर चाबी नहीं मिली, तो 1.5 सेकंड रुको और फिर कोशिश करो
                    await new Promise(res => setTimeout(res, 1500)); 
                }
            }
        }

        // अगर 3 कोशिशों के बाद भी चाबी न मिले
        if (!key) {
            addBubble("भाई, API Key लोड नहीं हो पाई। थोड़ा इंतज़ार करके पेज रिफ्रेश करो।", 'bot');
            if (typingUI) typingUI.style.display = 'none';
            return;
        }

        // 🚀 असली API कॉल (जब चाबी मिल जाए)
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
            const reply = data.choices[0].message.content;
            addBubble(reply, 'bot');
        } else {
            addBubble("AI से जवाब नहीं मिल पाया, दोबारा कोशिश करें।", 'bot');
        }

    } catch (e) { 
        console.error("Chat Error:", e);
        addBubble("नेटवर्क में कुछ गड़बड़ है भाई, इंटरनेट चेक करो!", 'bot');
    }

    // काम खत्म होने पर टाइपिंग इंडिकेटर छुपाओ
    if (typingUI) typingUI.style.display = 'none';
}

// ✅ 2. इमेज बनाने का फंक्शन
async function generateAIImage(prompt) {
    const typingUI = document.getElementById('typing-ui');
    if (typingUI) typingUI.style.display = 'none'; 
    
    addBubble("🎨 Drawing...", 'bot');
    const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=512&height=512&seed=${Math.random()}`;
    addBubble(`<img src="${url}" style="width:100%; border-radius:10px; margin-top:10px;" alt="AI Generated">`, 'bot');
}

// ✅ 3. कीबोर्ड का 'Enter' बटन सपोर्ट
const inputField = document.getElementById('user-input');
if (inputField) {
    inputField.addEventListener("keypress", (e) => { 
        if (e.key === "Enter") {
            sendMsg();
        }
    });
}
