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

// ============ 🧱 SAFE DOM CHAT RENDERING ============
// केवल Pollinations के अपने image endpoint को इस चैट में इमेज के रूप में दिखाएँ।
// बाकी URLs को साधारण टेक्स्ट की तरह दिखाया जाएगा।
function getSafeChatImageUrl(rawUrl) {
    if (typeof rawUrl !== 'string' || rawUrl.length > 4096) return null;

    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'https:') return null;
        if (parsed.hostname.toLowerCase() !== 'pollinations.ai') return null;
        if (parsed.username || parsed.password) return null;
        if (!parsed.pathname.startsWith('/p/')) return null;
        return parsed.href;
    } catch (error) {
        return null;
    }
}

function appendTextWithBreaks(text, container) {
    const lines = String(text).split('\n');

    for (let i = 0; i < lines.length; i++) {
        if (i > 0) container.appendChild(document.createElement('br'));
        if (lines[i]) {
            container.appendChild(document.createTextNode(lines[i]));
        }
    }
}

function appendChatImage(url, altText, container) {
    const safeUrl = getSafeChatImageUrl(url);
    if (!safeUrl) return false;

    const img = document.createElement('img');
    img.src = safeUrl;
    img.alt = String(altText || 'AI Generated Image').slice(0, 200);
    img.style.width = '100%';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.borderRadius = '10px';
    img.style.marginTop = '10px';
    img.setAttribute('loading', 'lazy');
    container.appendChild(img);
    return true;
}

function appendTextAndImages(text, container) {
    // केवल Markdown image syntax को पहचानें। URL की अलग से allowlist जाँच होगी।
    const imageRegex = /!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = imageRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            appendTextWithBreaks(text.substring(lastIndex, match.index), container);
        }

        const wasAdded = appendChatImage(match[2], match[1], container);
        if (!wasAdded) {
            // अनजान/अनुमति न मिले URL को HTML या image न मानें; मूल Markdown टेक्स्ट दिखाएँ।
            appendTextWithBreaks(match[0], container);
        }

        lastIndex = imageRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        appendTextWithBreaks(text.substring(lastIndex), container);
    }
}

function createCodeBlock(language, codeText) {
    const safeLanguage = /^[a-zA-Z0-9_+#.-]{1,30}$/.test(language || '')
        ? language
        : 'text';

    const codeDiv = document.createElement('div');
    codeDiv.className = 'code-block';

    const header = document.createElement('div');
    header.className = 'code-header';

    const languageLabel = document.createElement('span');
    languageLabel.textContent = safeLanguage;
    header.appendChild(languageLabel);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copy 💻';
    copyButton.onclick = function () { copyCode(this); };
    header.appendChild(copyButton);
    codeDiv.appendChild(header);

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'language-' + safeLanguage;
    code.textContent = String(codeText).replace(/^\r?\n/, '').replace(/\r?\n$/, '');
    pre.appendChild(code);
    codeDiv.appendChild(pre);

    return codeDiv;
}

function parseBotContent(text) {
    const container = document.createElement('div');
    container.className = 'text-content';
    const source = String(text == null ? '' : text);

    // पुराने version ने Firestore में <img ...> HTML सेव किया था।
    // केवल उसी पुराने Pollinations image pattern को पहचानें; बाकी HTML plain text रहेगा।
    const legacyImageMatch = source.trim().match(/^<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*\/?>$/i);
    if (legacyImageMatch) {
        if (appendChatImage(legacyImageMatch[2], 'AI Generated Image', container)) {
            return container;
        }
    }

    // Code fence को पहले अलग DOM element बनाते हैं। उसके अंदर Markdown image नहीं खोजी जाती।
    const codeRegex = /```([a-zA-Z0-9_+#.-]+)?[ \t]*\r?\n?([\s\S]*?)(?:```|$)/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(source)) !== null) {
        if (match.index > lastIndex) {
            appendTextAndImages(source.substring(lastIndex, match.index), container);
        }

        const language = match[1] || 'text';
        container.appendChild(createCodeBlock(language, match[2]));
        lastIndex = codeRegex.lastIndex;
    }

    if (lastIndex < source.length) {
        appendTextAndImages(source.substring(lastIndex), container);
    }

    // खाली जवाब में भी text-content container मौजूद रहेगा।
    return container;
}

function addBubble(text, sender) {
    const div = document.createElement('div');
    div.className = sender === 'bot' ? 'msg bot' : 'msg user';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'bubble';

    if (sender === 'bot') {
        bubbleDiv.appendChild(parseBotContent(text));

        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';
        btnGroup.style.marginTop = '10px';
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '10px';

        const listenButton = document.createElement('button');
        listenButton.type = 'button';
        listenButton.className = 'action-btn';
        listenButton.textContent = 'Listen 🔊';
        listenButton.style.cssText = 'cursor:pointer;background:#00a884;color:white;border:none;padding:5px 10px;border-radius:5px;';
        listenButton.onclick = function () { speakFromBubble(this); };

        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.className = 'action-btn';
        copyButton.textContent = 'Copy Text';
        copyButton.style.cssText = 'cursor:pointer;background:#444;color:white;border:none;padding:5px 10px;border-radius:5px;';
        copyButton.onclick = function () { copyToClipboard(this); };

        btnGroup.appendChild(listenButton);
        btnGroup.appendChild(copyButton);
        bubbleDiv.appendChild(btnGroup);
    } else {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'text-content';
        appendTextWithBreaks(String(text == null ? '' : text), contentDiv);
        bubbleDiv.appendChild(contentDiv);
    }

    div.appendChild(bubbleDiv);
    if (chatBox) {
        chatBox.appendChild(div);
    }

    if (sender === 'bot' && typeof Prism !== 'undefined' && Prism.highlightAllUnder) {
        setTimeout(() => {
            try { Prism.highlightAllUnder(div); }
            catch (error) { console.warn('Prism highlighting skipped:', error); }
        }, 50);
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
        addBubble('🎨 Drawing...', 'bot');
    }

    const seed = Math.floor(Math.random() * 1000000000);
    const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}`;
    const safeUrl = getSafeChatImageUrl(url);

    if (!safeUrl) {
        if (currentConversationId === activeConvId) {
            addBubble('इमेज URL सुरक्षित नहीं है। कृपया दोबारा कोशिश करें।', 'bot');
        }
        return;
    }

    // Firestore में HTML नहीं, साधारण Markdown सेव होगा।
    // addBubble इसे सुरक्षित DOM image में बदलता है; पुरानी चैट भी इसी तरह खुलेगी।
    const imageMarkdown = `![AI Generated Image](${safeUrl})`;

    if (currentConversationId === activeConvId) {
        addBubble(imageMarkdown, 'bot');
    }

    await saveChatToFirestore(`/image ${prompt}`, imageMarkdown, activeConvId);
    await loadConversationList();
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