// 1. Config (Firebase की चाबी यहाँ वापस डाल दी ताकि सिस्टम तुरंत चालू हो जाए)
const firebaseConfig = {
    apiKey: "AIzaSyCL4YKtPYxxhLoGwjw7A_81WWYBsOQZmoQ", 
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

// 🛡️ DEFAULT VALUES
remoteConfig.defaultConfig = {
    'OPENAI_API_KEY': ''
};

let auth = firebase.auth();
let provider = new firebase.auth.GoogleAuthProvider();

// 🔑 सीधे ऑथेंटिकेशन और रिमोट कॉन्फ़िग सेटअप करें
async function setupSystem() {
    try {
        // Firebase चालू हो चुका है, बस रिमोट कॉन्फ़िग को बैकग्राउंड में ताज़ा करें
        await remoteConfig.fetchAndActivate();
        console.log("Remote Config Initialized ✅");
        
        handleRedirectResult();
        observeAuth();
        
        console.log("Majhim System: Ready 🚀");
    } catch (err) {
        console.error("Setup Error:", err);
    }
}

// सिस्टम स्टार्ट करें
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
        if (result && result.user) console.log("User Logged In:", result.user.displayName);
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
        await remoteConfig.fetchAndActivate(); 
        let key = remoteConfig.getValue('OPENAI_API_KEY').asString();
        
        if (!key || key.trim() === "") {
            console.log("Key not found, retrying...");
            await new Promise(res => setTimeout(res, 2000)); // 2 सेकंड इंतज़ार
            await remoteConfig.activate();
            key = remoteConfig.getValue('OPENAI_API_KEY').asString();
        }
        return key; 
    } catch (err) { 
        console.error("Remote Config Error:", err);
        return null; 
    }
}

// ✅ यह चेक करने के लिए कि क्या Groq Key आ रही है
setTimeout(async () => {
    const testKey = await getAIKey();
    if(testKey && testKey.trim() !== "") {
        console.log("Groq Key Loaded Successfully ✅");
    } else {
        alert("Alert: Remote Config से Groq Key नहीं मिल पाई! ❌");
    }
}, 4000);
