// ==========================================
// 🎤 VOICE TYPING (MIC BUTTON LOGIC)
// ==========================================
function startVoiceTyping() {
    const inputField = document.getElementById('user-input');
    const micBtn = document.getElementById('mic-btn');

    if (!('webkitSpeechRecognition' in window)) {
        alert("Sorry, your browser does not support speech recognition.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
        micBtn.innerText = "🛑";
        micBtn.style.background = "#ff4444";
    };

    recognition.onresult = (event) => {
        inputField.value = event.results[0][0].transcript;
    };

    recognition.onend = () => {
        micBtn.innerText = "🎤";
        micBtn.style.background = "#00a884";
    };

    recognition.start();
}

// ==========================================
// 🎤 HYBRID STABLE VOICE ENGINE
// ==========================================
let queue = [];
let index = 0;
let isPlaying = false;
let isPaused = false;
let isSpeaking = false;
let currentAudio = null;
let activeBtn = null;

function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    isSpeaking = false;

    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.src = "";
        } catch (e) {}
        currentAudio = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
            window.speechSynthesis.cancel();
        } catch (e) {}
    }

    if (activeBtn) {
        activeBtn.innerText = "Listen 🔊";
        activeBtn = null;
    }
}

function splitText(text) {
    text = text.replace(/```[\s\S]*?```/g, "कोड ब्लॉक");

    let sentences = [];
    let current = "";

    for (let char of text) {
        current += char;
        if ("।!?.".includes(char)) {
            sentences.push(current.trim());
            current = "";
        }
    }

    if (current.trim()) {
        sentences.push(current.trim());
    }

    let finalQueue = [];
    sentences.forEach(s => {
        if (s.length < 180) {
            finalQueue.push(s);
        } else {
            let words = s.split(' ');
            let chunk = '';
            words.forEach(w => {
                if ((chunk + w).length < 180) {
                    chunk += w + ' ';
                } else {
                    finalQueue.push(chunk.trim());
                    chunk = w + ' ';
                }
            });
            if (chunk.trim()) finalQueue.push(chunk.trim());
        }
    });

    return finalQueue.filter(line => line.length > 0);
}

function speak(text) {
    if (!isPlaying || isPaused) return;

    isSpeaking = true;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;

    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.src = "";
        } catch (e) {}
    }

    try {
        currentAudio = new Audio(url);

        currentAudio.onended = () => {
            isSpeaking = false;
            index++;
            processQueue();
        };

        currentAudio.onerror = () => {
            fallbackSpeak(text);
        };

        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                fallbackSpeak(text);
            });
        }
    } catch (e) {
        fallbackSpeak(text);
    }
}

function fallbackSpeak(text) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = "hi-IN";

            utter.onend = () => {
                isSpeaking = false;
                index++;
                processQueue();
            };
            
            utter.onerror = () => {
                isSpeaking = false;
                index++;
                processQueue();
            };

            window.speechSynthesis.speak(utter);
            return;
        } catch (e) {}
    }
    
    isSpeaking = false;
    index++;
    processQueue();
}

function processQueue() {
    if (!isPlaying || isPaused || isSpeaking) return;

    if (index >= queue.length) {
        stopSpeech();
        return;
    }
    speak(queue[index]);
}

function startSpeech(btn) {
    stopSpeech();
    const textContent = btn.closest('.bubble')?.querySelector('.text-content');
    if (!textContent) return;

    const text = textContent.innerText;
    queue = splitText(text);
    index = 0;
    isPlaying = true;
    isPaused = false;
    activeBtn = btn;
    btn.innerText = "Pause ⏸️";
    processQueue();
}

function pauseSpeech() {
    if (!isPlaying) return;
    isPaused = true;
    
    if (currentAudio) {
        try {
            currentAudio.pause();
        } catch (e) {}
    }

    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        try {
            window.speechSynthesis.pause();
        } catch (e) {}
    }

    if (activeBtn) activeBtn.innerText = "Resume ▶️";
}

function resumeSpeech() {
    if (!isPlaying || !isPaused) return;
    isPaused = false;
    if (activeBtn) activeBtn.innerText = "Pause ⏸️";

    // हाइब्रिड अप्रोच: अगर ऑडियो ऑब्जेक्ट मौजूद है और पॉज्ड है, तो उसे चलाएं
    if (currentAudio && currentAudio.paused) {
        try {
            const playPromise = currentAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    return; // सफलतापूर्वक रिज्यूम हो गया
                }).catch(() => {
                    regenAndPlayCurrentIndex();
                });
            } else {
                return;
            }
        } catch (e) {
            regenAndPlayCurrentIndex();
        }
    } else {
        regenAndPlayCurrentIndex();
    }
}

// फॉलबैक या नए सिरे से उसी इंडेक्स को प्ले करने के लिए
function regenAndPlayCurrentIndex() {
    if (index < queue.length) {
        speak(queue[index]);
    } else {
        stopSpeech();
    }
}

function toggleSpeech(btn) {
    if (isPlaying && !isPaused) {
        pauseSpeech();
    } else if (isPlaying && isPaused) {
        resumeSpeech();
    } else {
        startSpeech(btn);
    }
}

function speakFromBubble(btn) {
    if (activeBtn && activeBtn !== btn) {
        stopSpeech();
    }
    toggleSpeech(btn);
}

// ==========================================
// 📋 COPY FUNCTIONS (TEXT & CODE)
// ==========================================
function copyToClipboard(btn) {
    const textContent = btn.closest('.bubble')?.querySelector('.text-content');
    if (!textContent) return;
    const text = textContent.innerText;
    
    const success = () => {
        const old = btn.innerText;
        btn.innerText = "Copied ✅";
        setTimeout(() => btn.innerText = old, 2000);
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(success).catch(() => fallbackCopy(text, success));
    } else {
        fallbackCopy(text, success);
    }
}

function copyCode(btn) {
    const codeEl = btn.closest('.code-block')?.querySelector("code");
    if (!codeEl) return;
    const code = codeEl.innerText;
    
    const success = () => {
        const old = btn.innerText;
        btn.innerText = "Copied ✅";
        setTimeout(() => btn.innerText = old, 2000);
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(success).catch(() => fallbackCopy(code, success));
    } else {
        fallbackCopy(code, success);
    }
}

function fallbackCopy(text, cb) {
    try {
        const t = document.createElement("textarea");
        t.value = text;
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
    } catch (e) {}
    cb();
}
