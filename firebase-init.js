// 1. Config (API Key अब पूरी तरह से Remote Config के हाथ में है)
const firebaseConfig = {
    authDomain: "majhim-ai.firebaseapp.com",
    projectId: "majhim-ai",
    storageBucket: "majhim-ai.firebasestorage.app",
    messagingSenderId: "361749678090",
    appId: "1:361749678090:web:ed1668151fbe935fecb7f3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const remoteConfig = firebase.remoteConfig();

// 🔥 IMPORTANT: डेटा तुरंत खींचने के लिए सेटिंग्स
remoteConfig.settings.minimumFetchIntervalMillis = 0;

// 🛡️ DEFAULT VALUES: अगर नेटवर्क स्लो हो तो कम से कम कोड क्रैश न हो
remoteConfig.defaultConfig = {
    'FIREBASE_API_KEY': '',
    'OPENAI_API_KEY': ''
};

let auth;
let provider;

// 🔑 सिस्टम सेटअप करने वाला फंक्शन (Remote Config आधारित)
async function setupSystem() {
    try {
        // सबसे पहले तिजोरी खोलें (Fetch & Activate)
        await remoteConfig.fetchAndActivate();
        
        // 1. Firebase की चाबी निकालें
        const fbKey = remoteConfig.getValue('FIREBASE_API_KEY').asString();
        
        if (fbKey && fbKey.trim() !== "") {
            // Firebase को उसकी चाबी सौंपें
            firebase.app().options.apiKey = fbKey;
            console.log("Firebase Auth Key Loaded ✅");
        } else {
            console.warn("FIREBASE_API_KEY not found in Remote Config!");
        }

        // 2. बाकी सिस्टम शुरू करें
        auth = firebase.auth();
        provider = new firebase.auth.GoogleAuthProvider();

        handleRedirectResult();
        observeAuth();
        
        console.log("Majhim System: Ready 🚀");
    } catch (err) {
        console.error("Setup Error:", err);
    }
}

// सेटअप शुरू करें
setupSystem();

// --- Auth Functions ---
function login() {
    if (!auth) return alert("सिस्टम लोड हो रहा है, थोड़ा इंतज़ार करें...");
    auth.signInWithRedirect(provider);
}

function logout() {
    if (auth) auth.signOut();
}

async function handleRedirectResult() {
    try {
        const result = await auth.getRedirectResult();
        if (result.user) console.log("User Logged In:", result.user.displayName);
    } catch (error) {
        console.error("Redirect Error:", error.message);
    }
}

function observeAuth() {
    auth.onAuthStateChanged((user) => {
        const loginBtn = document.getElementById('login-btn');
        const userProfile = document.getElementById('user-profile');
        const userName = document.getElementById('user-name');

        if (user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'flex';
                userName.innerText = user.displayName.split(' ')[0];
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
        }
    });
}

// 🔑 AI Key लाने वाला फंक्शन (Groq के लिए - ai-logic.js इसे कॉल करेगा)
async function getAIKey() {
    try { 
        // ताज़ा डेटा खींचने की कोशिश
        await remoteConfig.fetchAndActivate(); 
        const key = remoteConfig.getValue('OPENAI_API_KEY').asString();
        
        if (!key || key.trim() === "") {
            // अगर पहली बार में न मिले, तो 1.5 सेकंड का इंतज़ार करके फिर कोशिश करें
            console.log("Key not found, retrying...");
            await new Promise(res => setTimeout(res, 1500));
            await remoteConfig.activate();
            return remoteConfig.getValue('OPENAI_API_KEY').asString();
        }
        
        return key; 
    } catch (err) { 
        console.error("Remote Config Error:", err);
        return null; 
    }
}


// यह चेक करने के लिए कि क्या Remote Config काम कर रहा है
setTimeout(async () => {
    const testKey = await getAIKey();
    console.log("Testing Key on Load:", testKey);
    if(testKey) alert("बधाई हो! चाबी मिल गई: " + testKey.substring(0,5) + "...");
    else alert("अभी भी खाली है भाई! ❌");
}, 3000);
