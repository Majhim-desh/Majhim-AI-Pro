// ✅ FINAL FIREBASE SETUP (WORKING)

const firebaseConfig = {
    apiKey: "YOUR_REAL_API_KEY", // 🔥 अपनी असली key डालो
    authDomain: "majhim-ai.firebaseapp.com",
    projectId: "majhim-ai",
    storageBucket: "majhim-ai.firebasestorage.app",
    messagingSenderId: "361749678090",
    appId: "1:361749678090:web:ed1668151fbe935fecb7f3"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// ✅ LOGIN (Redirect method - GitHub pages friendly)
function login() {
    auth.signInWithRedirect(provider);
}

// ✅ PAGE LOAD पर RESULT HANDLE करो
window.onload = async () => {
    try {
        const result = await auth.getRedirectResult();
        if (result.user) {
            console.log("Login Success:", result.user.displayName);
        }
    } catch (error) {
        console.error("Login Error:", error);
    }
};

// ✅ AUTO STATE
auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');

    if (user) {
        if (loginBtn) loginBtn.innerText = user.displayName.split(' ')[0];
    } else {
        if (loginBtn) loginBtn.innerText = "Login";
    }
});

// ✅ LOGOUT
function logout() {
    auth.signOut();
}
