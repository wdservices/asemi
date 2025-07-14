// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCdFu24SWTYh9TrH1pYaU4g6cKcx11XRRE",
    authDomain: "asemi-authentication.firebaseapp.com",
    projectId: "asemi-authentication",
    storageBucket: "asemi-authentication.appspot.com",
    messagingSenderId: "226350315554",
    appId: "1:226350315554:web:5f3174a99e4d49dec9f27b"
};


// Initialize Firebase
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const auth = getAuth(app);

export { app, auth };
