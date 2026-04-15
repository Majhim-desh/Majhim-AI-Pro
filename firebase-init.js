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

// 🔓 अपडेटेड LOGIN FUNCTION 
async function login() {
    console.log("Login button clicked");
    
    if (!auth) {
        alert("सिस्टम थोड़ा समय ले रहा है, एक बार फिर दबाएं...");
        await setupSystem(); // चाबी लाने की दोबारा कोशिश
        return;
    }

    try {
        // गूगल पॉपअप खोलने की कोशिश
        await auth.signInWithPopup(provider);
        console.log("Popup opened successfully");
    } catch (error) {
        console.error("Popup Error:", error.message);
        
        // पॉपअप ब्लॉक होने पर गाइड करें
        if (error.code === 'auth/popup-blocked' || error.message.includes('popup')) {
            alert("पॉपअप ब्लॉक है! कृपया Chrome की सेटिंग में जाकर Pop-ups को 'Allow' करें।");
        } else {
            alert("लॉगिन एरर: " + error.message);
        }
    }
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
