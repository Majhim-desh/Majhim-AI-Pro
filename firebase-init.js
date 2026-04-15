// 1. Firebase Config (API Key यहाँ से हटा दी गई है)
const firebaseConfig = {
    authDomain: "majhim-ai.firebaseapp.com",
    projectId: "majhim-ai",
    storageBucket: "majhim-ai.firebasestorage.app",
    messagingSenderId: "361749678090",
    appId: "1:361749678090:web:ed1668151fbe935fecb7f3"
};

// Initialize Firebase (शुरुआत में बिना Key के)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const remoteConfig = firebase.remoteConfig();
remoteConfig.settings.minimumFetchIntervalMillis = 0;

// Auth और Provider को Global रखें ताकि सब जगह इस्तेमाल हो सकें
let auth;
let provider;

// 🔑 मुख्य फंक्शन: जो चाबियां लाएगा और सब सेटअप करेगा
async function setupSystem() {
    try {
        // Remote Config से डेटा मंगाएं
        await remoteConfig.fetchAndActivate();
        
        // 1. Firebase API Key निकालें और सेट करें
        const fbKey = remoteConfig.getValue('FIREBASE_API_KEY').asString();
        firebase.app().options.apiKey = fbKey;
        
        // अब Auth चालू करें क्योंकि अब हमारे पास चाबी है
        auth = firebase.auth();
        provider = new firebase.auth.GoogleAuthProvider();
        
        // Auth State चेक करना शुरू करें
        observeAuth();
        
        console.log("System Ready: All Keys Loaded!");
    } catch (err) {
        console.error("Setup Error:", err);
    }
}

// सिस्टम शुरू करें
setupSystem();

// 🔑 AI Key (Groq/OpenAI) लाने वाला फंक्शन (पुराना ही है)
async function getAIKey() {
    try { 
        await remoteConfig.fetchAndActivate(); 
        return remoteConfig.getValue('OPENAI_API_KEY').asString(); 
    } catch (err) { return null; }
}

// 🔓 LOGIN FUNCTION
function login() {
    if (!auth) return alert("System initializing... please wait.");
    auth.signInWithPopup(provider).then((result) => {
        console.log("Logged In as:", result.user.displayName);
    }).catch((error) => {
        console.error("Login Error:", error.message);
    });
}

// 🔒 LOGOUT FUNCTION
function logout() {
    if (auth) auth.signOut();
}

// 🔄 AUTH STATE OBSERVER (इसे एक फंक्शन में डाल दिया ताकि चाबी आने के बाद चले)
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
