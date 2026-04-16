// 1. Config (API Key हटा दी गई है)
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
remoteConfig.settings.minimumFetchIntervalMillis = 0;

let auth;
let provider;

// 🔑 चाबी लाने वाला और सिस्टम सेटअप करने वाला फंक्शन
async function setupSystem() {
    try {
        await remoteConfig.fetchAndActivate();
        const fbKey = remoteConfig.getValue('FIREBASE_API_KEY').asString();
        
        // API Key सेट करें
        firebase.app().options.apiKey = fbKey;
        
        auth = firebase.auth();
        provider = new firebase.auth.GoogleAuthProvider();

        // Redirect Result चेक करें (जब लॉगिन करके पेज वापस लोड हो)
        handleRedirectResult();
        
        // Auth State पर नज़र रखें
        observeAuth();
        
        console.log("Majhim System: Redirect Mode Active ✅");
    } catch (err) {
        console.error("Setup Error:", err);
    }
}

setupSystem();

// ✅ LOGIN (Redirect Method - No Popup Blocker Issue)
function login() {
    if (!auth) return alert("सिस्टम लोड हो रहा है...");
    auth.signInWithRedirect(provider);
}

// ✅ LOGOUT
function logout() {
    if (auth) auth.signOut();
}

// ✅ REDIRECT RESULT HANDLE
async function handleRedirectResult() {
    try {
        const result = await auth.getRedirectResult();
        if (result.user) {
            console.log("Welcome back, " + result.user.displayName);
        }
    } catch (error) {
        if(error.code !== 'auth/configuration-not-found') {
            console.error("Login Error:", error.message);
        }
    }
}

// ✅ AUTH STATE OBSERVER (UI अपडेट करने के लिए)
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

// 🔑 AI Key लाने वाला फंक्शन (Groq के लिए)
// 🔑 AI Key लाने वाला फंक्शन (Groq के लिए) - IMPROVED
async function getAIKey() {
    try { 
        // 1. पक्का करें कि डेटा ताज़ा हो (0 सेकंड का वेट)
        remoteConfig.settings.minimumFetchIntervalMillis = 0;
        
        // 2. डेटा फेच करें और उसे एक्टिवेट करें
        await remoteConfig.fetchAndActivate(); 
        
        // 3. वैल्यू निकालें
        const key = remoteConfig.getValue('OPENAI_API_KEY').asString();
        
        // 4. अगर फिर भी न मिले, तो एक बार और कोशिश करें (Slight Delay)
        if (!key) {
            console.log("Retrying key fetch...");
            await new Promise(res => setTimeout(res, 1000)); // 1 सेकंड रुकें
            await remoteConfig.activate();
            return remoteConfig.getValue('OPENAI_API_KEY').asString();
        }
        
        return key; 
    } catch (err) { 
        console.error("Remote Config Error:", err);
        return null; 
    }
}
