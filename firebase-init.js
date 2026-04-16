// 1. Config
const firebaseConfig = {
    authDomain: "majhim-ai.firebaseapp.com",
    projectId: "majhim-ai",
    storageBucket: "majhim-ai.firebasestorage.app",
    messagingSenderId: "361749678090",
    appId: "1:361749678090:web:ed1668151fbe935fecb7f3"
};

// Initialize
firebase.initializeApp(firebaseConfig);
const remoteConfig = firebase.remoteConfig();

// 🔥 IMPORTANT: इसे ग्लोबल रखें ताकि ai-logic इसे तुरंत इस्तेमाल कर सके
remoteConfig.settings.minimumFetchIntervalMillis = 0;

let auth;
let provider;

async function setupSystem() {
    try {
        // पेज लोड होते ही सबसे पहले डेटा खींचें
        await remoteConfig.fetchAndActivate();
        
        // 🔑 Firebase की अंदरूनी चाबी (Auth के लिए)
        const fbKey = remoteConfig.getValue('FIREBASE_API_KEY').asString();
        if (fbKey) {
            firebase.app().options.apiKey = fbKey;
        }

        auth = firebase.auth();
        provider = new firebase.auth.GoogleAuthProvider();

        handleRedirectResult();
        observeAuth();
        
        console.log("Majhim System: Ready ✅");
    } catch (err) {
        console.error("Setup Error:", err);
    }
}

// सिस्टम स्टार्ट करें
setupSystem();

// --- Auth Functions ---
function login() {
    if (!auth) return alert("सिस्टम लोड हो रहा है...");
    auth.signInWithRedirect(provider);
}

function logout() {
    if (auth) auth.signOut();
}

async function handleRedirectResult() {
    try {
        const result = await auth.getRedirectResult();
        if (result.user) console.log("User Logged In");
    } catch (error) {
        console.error("Redirect Error:", error);
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
        // हर बार ताज़ा डेटा मांगने की कोशिश
        await remoteConfig.fetchAndActivate(); 
        const key = remoteConfig.getValue('OPENAI_API_KEY').asString();
        
        if (!key) {
            // अगर पहली बार में न मिले, तो 1 सेकंड का इंतज़ार करके एक्टिवेट करें
            await new Promise(res => setTimeout(res, 1000));
            await remoteConfig.activate();
            return remoteConfig.getValue('OPENAI_API_KEY').asString();
        }
        
        return key; 
    } catch (err) { 
        console.error("Remote Config Error:", err);
        return null; 
    }
}
