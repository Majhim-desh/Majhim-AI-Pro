// ============ 🛡️ XSS PROTECTION ============
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============ 🆔 UUID FALLBACK (पुराने browsers के लिए) ============
function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

// 2. Chat & UI Logic
const chatBox = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');

let currentConversationId = null;

// 🔥 Firestore: Parent Document + Subcollection Message Save
async function saveChatToFirestore(userMessage, aiResponse, convId) {
    const user = auth.currentUser;
    const targetConvId = convId || currentConversationId;

    if (!user || !targetConvId) return;

    try {
        const conversationRef = db
            .collection("users")
            .doc(user.uid)
            .collection("conversations")
            .doc(targetConvId);

        await conversationRef.set({
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: userMessage
        }, { merge: true });

        const messageRef = conversationRef.collection("messages").doc();
        await messageRef.set({
            userMessage: userMessage,
            aiResponse: aiResponse,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log("✅ Message saved to Firestore:", messageRef.id);

    } catch (error) {
        console.error("❌ Firestore Save Error:", error);
    }
}

// 📥 Firestore: Selected Conversation Messages Load
async function loadChatHistory(conversationId) {
    const user = auth.currentUser;
    if (!user || !conversationId) return;

    try {
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

        if (currentConversationId !== conversationId) return;

        messagesSnapshot.forEach((messageDoc) => {
            const chat = messageDoc.data();
            if (chat.userMessage) addBubble(chat.userMessage, 'user');
            if (chat.aiResponse) addBubble(chat.aiResponse, 'bot');
        });

    } catch (error) {
        console.error("❌ Single Conversation Load Error:", error);
    }
}

// 📋 Firestore: Active Conversations List Load
async function loadConversationList() {
    const user = auth.currentUser;
    const listContainer = document.getElementById('conversation-list');

    if (!user || !listContainer) return;

    try {
        const snapshot = await db
            .collection("users")
            .doc(user.uid)
            .collection("conversations")
            .orderBy("updatedAt", "desc")
            .get();

        listContainer.innerHTML = '';

        if (snapshot.empty) {
            listContainer.innerHTML = '<div style="font-size:12px; color:#8696a0; padding:10px;">कोई चैट मौजूद नहीं है</div>';
            return;
        }

        snapshot.forEach((doc) => {
            const conversationId = doc.id;
            const data = doc.data();

            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.innerText = data.lastMessage || `Chat (${conversationId.substring(0, 8)}...)`;

            item.onclick = () => {
                loadChatHistory(conversationId);
                if (typeof toggleSidebar === 'function') toggleSidebar();
            };

            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error("❌ Conversation List Error:", error);
    }
}

async function sendMsg() {
    if (!userInput) return;

    const text = userInput.value.trim();
    if (!text) return;

    if (!currentConversationId) {
        currentConversationId = generateId();
    }
    const activeConvId = currentConversationId;

    addBubble(text, 'user');
    userInput.value = '';

    if (text.startsWith("/image ")) {
        generateAIImage(text.replace("/image ", ""), activeConvId);
    } else {
        callChatGPT(text, activeConvId);
    }
}

function addBubble(text, sender) {
    const div = document.createElement('div');
    div.className = `msg ${sender}`;

    // 🛡️ सबसे पहले escape करो (XSS से बचाव)
    let htmlContent = escapeHTML(text);

    if (sender === 'bot') {
        // Escaped text में code blocks को HTML में बदलो
        htmlContent = htmlContent.replace(/```(\w+)?([\s\S]*?)```/g, (m, lang, code) => {
            return `
            <div class="code-block">
                <div class="code-header">
                    <span>${lang || 'code'}</span>
                    <button onclick="copyCode(this)">Copy 💻</button>
                </div>
                <pre><code class="language-${lang || 'javascript'}">${code.trim()}</code></pre>
            </div>`;
        });
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

    if (chatBox) chatBox.appendChild(div);

    if (sender === 'bot' && typeof Prism !== 'undefined') {
        setTimeout(() => Prism.highlightAllUnder(div), 50);
    }

    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
}

async function callChatGPT(query, activeConvId) {
    const typingUI = document.getElementById('typing-ui');
    if (typingUI) typingUI.style.display = 'inline';

    try {
        const res = await fetch(
            'https://groq-proxy.bnmadheshi108.workers.dev',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: query })
            }
        );

        if (!res.ok) {
            throw new Error(`Server returned status: ${res.status}`);
        }

        const data = await res.json();

        if (data.choices && data.choices[0]) {
            const aiResponse = data.choices[0].message.content;

            if (currentConversationId === activeConvId) {
                addBubble(aiResponse, 'bot');
            }

            await saveChatToFirestore(query, aiResponse, activeConvId);
            loadConversationList();
        } else {
            if (currentConversationId === activeConvId) {
                addBubble("AI से जवाब नहीं मिल पाया, दोबारा कोशिश करें।", 'bot');
            }
        }

    } catch (e) {
        if (currentConversationId === activeConvId) {
            addBubble("नेटवर्क में कुछ गड़बड़ है भाई, इंटरनेट चेक करो!", 'bot');
        }
    }

    if (typingUI) typingUI.style.display = 'none';
}

async function generateAIImage(prompt, activeConvId) {
    if (currentConversationId === activeConvId) {
        addBubble("🎨 Drawing...", 'bot');
    }

    const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=512&height=512&seed=${Math.random()}`;
    const imgHTML = `<img src="${url}" style="width:100%; border-radius:10px; margin-top:10px;" alt="AI Generated">`;

    if (currentConversationId === activeConvId) {
        addBubble(imgHTML, 'bot');
    }

    await saveChatToFirestore(`/image ${prompt}`, imgHTML, activeConvId);
    loadConversationList();
}

if (userInput) {
    userInput.addEventListener("keypress", (e) => { 
        if (e.key === "Enter") sendMsg();
    });
}

function startNewChat() {
    currentConversationId = null;
    if (chatBox) chatBox.innerHTML = '';
    if (userInput) {
        userInput.value = '';
        userInput.focus();
    }
}