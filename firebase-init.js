// 1. Firebase Config
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

let auth = firebase.auth();
let provider = new firebase.auth.GoogleAuthProvider();
let db = firebase.firestore();

// 🔑 सीधे ऑथेंटिकेशन सेटअप करें
async function setupSystem() {
    try {
        observeAuth();
        console.log("Majhim System: Ready 🚀");
    } catch (err) {
        console.error("Setup Error:", err);
    }
}

// सिस्टम स्टार्ट करें
setupSystem();

// --- Auth Functions ---
let loginInProgress = false;

async function login() {
    if (!auth || loginInProgress) return;

    loginInProgress = true;

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.disabled = true;

    try {
        console.log("LOGIN: Starting...");
        console.log("LOGIN: Current URL:", window.location.href);
        console.log("LOGIN: Origin:", window.location.origin);
        console.log("LOGIN: Auth Domain:", firebaseConfig.authDomain);
        console.log("LOGIN: Project ID:", firebaseConfig.projectId);

        const result = await auth.signInWithPopup(provider);

        console.log("LOGIN SUCCESS:", result.user);
        
    } catch (error) {
        console.error("========== GOOGLE LOGIN ERROR ==========");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Name:", error.name);
        console.error("Full Error:", error);
        console.error("========================================");

        alert(
            "Login Error\n\n" +
            "Code: " + error.code + "\n\n" +
            "Message: " + error.message
        );

    } finally {
        loginInProgress = false;
        if (loginBtn) loginBtn.disabled = false;
    }
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

            // 🧹 Chat box साफ करें और Conversation List लोड करें
            if (chatBox) chatBox.innerHTML = '';
            loadConversationList();

        } else {
            if (loginBtn) loginBtn.style.display = 'block';

            if (userProfile) {
                userProfile.style.display = 'none';
            }
        }
    });
}