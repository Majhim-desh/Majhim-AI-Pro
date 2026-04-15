// 1. Firebase Config (API Key यहाँ से हटा दी गई है सुरक्षा के लिए)
const firebaseConfig = {
    authDomain: "majhim-ai.firebaseapp.com",
    projectId: "majhim-ai",
    storageBucket: "majhim-ai.firebasestorage.app",
    messagingSenderId: "361749678090",
    appId: "1:361749678090:web:ed1668151fbe935fecb7f3"
};

// Initialize Firebase (बिना Key के)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const remoteConfig = firebase.remoteConfig();
remoteConfig.settings.minimumFetchIntervalMillis = 0;

// ग्लोबल वेरिएबल्स
let auth;
let provider;

// 🔑 मुख्य फंक्शन: जो रिमोट से चाबी लाएगा और सिस्टम चालू करेगा
async function setupSystem() {
    try {
        await remoteConfig.fetchAndActivate();
        
        // Firebase API Key को Remote Config से मंगाना
        const fbKey = remoteConfig.getValue('FIREBASE_API_KEY').asString();
        
        if (!fbKey) {
            console.error("API Key नहीं मिली! Firebase में FIREBASE_API_KEY चेक करें।");
            return;
        }

        // चाबी को ऐप में सेट करना
        firebase.app().options.apiKey = fbKey;
        
        // अब Auth और Provider को एक्टिव करें
        auth = firebase.auth();
        provider = new firebase.auth.GoogleAuthProvider();
        
        // लॉगिन की स्थिति पर नज़र रखें
        observeAuth();
        
        console.log("Majhim AI Security: Active ✅");
    } catch (err) {
        console.error("Setup Error:", err);
    }
}

// सिस्टम शुरू करें
setupSystem();

// 🔑 AI Key लाने वाला फंक्शन (जो ai-logic.js इस्तेमाल करेगा)
async function getAIKey() {
    try { 
        await remoteConfig.fetchAndActivate(); 
        return remoteConfig.getValue('OPENAI_API_KEY').asString(); 
    } catch (err) { return null; }
}

// 🔓 LOGIN FUNCTION (जब बटन दबेगा)
function login() {
    if (!auth) {
        alert("सिस्टम चालू हो रहा है, कृपया 2 सेकंड रुकें...");
        return;
    }
    auth.signInWithPopup(provider).then((result) => {
        console.log("Logged In:", result.user.displayName);
    }).catch((error) => {
        console.error("Login Error:", error.message);
        alert("लॉगिन फेल हुआ: " + error.message);
    });
}

// 🔒 LOGOUT FUNCTION
function logout() {
    if (auth) {
        auth.signOut();
    }
}

// 🔄 AUTH STATE OBSERVER (बटन और नाम ऑटोमैटिक बदलेगा)
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
