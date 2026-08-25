// 2. Chat & UI Logic
const chatBox = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');

// 🆔 करंट चालू चैट की ID ट्रैक करने के लिए
let currentConversationId = null;

// 🔥 Firestore: Dynamic Conversation under Message Save
async function saveChatToFirestore(userMessage, aiResponse) {
    const user = auth.currentUser;

    if (!user || !currentConversationId) return;

    try {
        const conversationRef = db
            .collection("users")
            .doc(user.uid)
            .collection("conversations")
            .doc(currentConversationId);

        const messageRef = conversationRef
            .collection("messages")
            .doc();

        await messageRef.set({
            userMessage: userMessage,
            aiResponse: aiResponse,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log("✅ Message saved:", messageRef.id);
        console.log("🆔 Conversation:", currentConversationId);

    } catch (error) {
        console.error("❌ Firestore Save Error:", error);
    }
}

// 📥 Firestore: Selected Conversation के Messages Load करें
async function loadChatHistory(conversationId) {
    const user = auth.currentUser;

    if (!user || !conversationId) return;

    try {
        // स्क्रीन साफ करें और Current ID सेट करें
        if (chatBox) chatBox.innerHTML = '';
        currentConversationId = conversationId;

        const messagesSnapshot = await db
            .collection("users")
            .doc(user.uid)
            .collection("conversations")
            .doc(conversationId)
            .collection("messages")
            .orderBy("createdAt", "asc")
            .get();

        // सिर्फ इसी Conversation के Messages स्क्रीन पर दिखाएँ
        messagesSnapshot.forEach((messageDoc) => {
            const chat = messageDoc.data();

            if (chat.userMessage) {
                addBubble(chat.userMessage, 'user');
            }

            if (chat.aiResponse) {
                addBubble(chat.aiResponse, 'bot');
            }
        });

        console.log("✅ Messages loaded for conversation:", conversationId);

    } catch (error) {
        console.error("❌ Single Conversation Load Error:", error);
    }
}

// 📋 Firestore: Conversation List Load करना और UI में दिखाना
async function loadConversationList() {
    const user = auth.currentUser;
    const listContainer = document.getElementById('conversation-list');

    if (!user) return;

    try {
        const snapshot = await db
            .collection("users")
            .doc(user.uid)
            .collection("conversations")
            .get();

        console.log("📋 Conversations found:", snapshot.size);

        // अगर HTML में conversation-list एलिमेंट मौजूद है तो उसमें लिस्ट रेंडर करें
        if (listContainer) {
            listContainer.innerHTML = '';

            snapshot.forEach((doc) => {
                const conversationId = doc.id;

                const item = document.createElement('div');
                item.className = 'conversation-item';
                item.innerText = `Chat (${conversationId.substring(0, 8)}...)`;
                
                // लिस्ट आइटम पर क्लिक करने से वही चैट लोड होगी
                item.onclick = () => {
                    loadChatHistory(conversationId);
                };

                listContainer.appendChild(item);
            });
        }

    } catch (error) {
        console.error("❌ Conversation List Error:", error);
    }
}

async function sendMsg() {
    const text = userInput.value.trim();
    if (!text) return;

    // 🆕 अगर current conversation नहीं है तो नई ID बनाएं
    if (!currentConversationId) {
        currentConversationId = crypto.randomUUID();
        console.log("🆕 New Conversation ID:", currentConversationId);
    }

    addBubble(text, 'user');
    userInput.value = '';

    if (text.startsWith("/image ")) {
        generateAIImage(text.replace("/image ", ""));
    } else {
        callChatGPT(text);
    }
}

function addBubble(text, sender) {
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    
    let htmlContent = text;
    let rawTextForVoice = text;

    if (sender === 'bot') {        
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
        
        rawTextForVoice = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");
    }

    const buttons = sender === 'bot' ? `
        <div class="btn-group" style="margin-top:10px; display:flex; gap:10px;">
            <button class="action-btn" onclick="speakFromBubble(this)" style="cursor:pointer; background:#00a884; color:white; border:none; padding:5px 10px; border-radius:5px;">Listen 🔊</button>
            <button class="action-btn" onclick="copyToClipboard(this)" style="cursor:pointer; background:#444; color:white; border:none; padding:5px 10px; border-radius:5px;">Copy Text</button>
        </div>` : '';

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

// ✅ AI API Call through Cloudflare Worker
async function callChatGPT(query) {
    const typingUI = document.getElementById('typing-ui');
    if (typingUI) typingUI.style.display = 'inline';

    try {
        const res = await fetch(
            'https://groq-proxy.bnmadheshi108.workers.dev',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: query
                })
            }
        );

        const data = await res.json();

        if (data.choices && data.choices[0]) {
            const aiResponse = data.choices[0].message.content;

            addBubble(aiResponse, 'bot');
            await saveChatToFirestore(query, aiResponse);
            
            // मैसेज सेव होने के बाद लिस्ट को रिफ्रेश करें ताकि नई चैट Sidebar में दिख जाए
            loadConversationList();
        } else {
            console.error("Worker response:", data);
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

// =========================================
// 🆕 4. New Chat Management / Navigation Logic
// =========================================

function startNewChat() {
    currentConversationId = null;

    if (chatBox) {
        chatBox.innerHTML = '';
    }

    if (userInput) {
        userInput.value = '';
        userInput.focus();
    }

    console.log("🆕 New Chat Started");
}