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

// 🔑 सीधे ऑथेंटिकेशन सेटअप करें
async function setupSystem() {
    try {
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