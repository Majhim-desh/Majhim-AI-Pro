const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "majhim-ai.firebaseapp.com",
    projectId: "majhim-ai",
    storageBucket: "majhim-ai.firebasestorage.app",
    messagingSenderId: "361749678090",
    appId: "1:361749678090:web:ed1668151fbe935fecb7f3"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

function login() {
    auth.signInWithRedirect(provider);
}

function logout() {
    auth.signOut();
}

auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');

    if (user) {
        if (loginBtn) loginBtn.innerText = user.displayName.split(' ')[0];
    } else {
        if (loginBtn) loginBtn.innerText = "Login";
    }
});
