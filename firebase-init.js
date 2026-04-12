// 1. Firebase & Config Logic
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

// Initialize Remote Config
const remoteConfig = firebase.remoteConfig();
remoteConfig.settings.minimumFetchIntervalMillis = 0;

// 🔥 NEW: Initialize Auth
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// 🔑 Get AI Key
async function getAIKey() {
    try { 
        await remoteConfig.fetchAndActivate(); 
        return remoteConfig.getValue('OPENAI_API_KEY').asString(); 
    } catch (err) { return null; }
}

// 🔓 LOGIN FUNCTION (Google Popup)
function login() {
    auth.signInWithPopup(provider).then((result) => {
        console.log("Logged In as:", result.user.displayName);
    }).catch((error) => {
        console.error("Login Error:", error.message);
        alert("Login failed! Make sure your internet is on.");
    });
}

// 🔒 LOGOUT FUNCTION
function logout() {
    auth.signOut().then(() => {
        console.log("Logged Out");
    });
}

// 🔄 AUTH STATE OBSERVER (बटन को ऑटोमैटिक बदलेगा)
auth.onAuthStateChanged((user) => {
    // हम मान लेते हैं कि आपके पास HTML में 'login-btn' और 'user-profile' ID हैं
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');

    if (user) {
        // अगर यूजर लॉगिन है
        if (loginBtn) loginBtn.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            userName.innerText = user.displayName.split(' ')[0]; // सिर्फ पहला नाम दिखाएं
        }
    } else {
        // अगर यूजर लॉगिन नहीं है
        if (loginBtn) loginBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
    }
});
