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

userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMsg(); });