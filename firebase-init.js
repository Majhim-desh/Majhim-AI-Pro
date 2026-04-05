// 1. Firebase & Config Logic
const firebaseConfig = {
    apiKey: "AIzaSyCL4YKtPYxxhLoGwjw7A_81WWYBsOQZmoQ",
    authDomain: "majhim-ai.firebaseapp.com",
    projectId: "majhim-ai",
    storageBucket: "majhim-ai.firebasestorage.app",
    messagingSenderId: "361749678090",
    appId: "1:361749678090:web:ed1668151fbe935fecb7f3"
};
firebase.initializeApp(firebaseConfig);
const remoteConfig = firebase.remoteConfig();
remoteConfig.settings.minimumFetchIntervalMillis = 0;

async function getAIKey() {
    try { 
        await remoteConfig.fetchAndActivate(); 
        return remoteConfig.getValue('OPENAI_API_KEY').asString(); 
    } catch (err) { return null; }
}