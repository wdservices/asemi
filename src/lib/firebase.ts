
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration using Environment Variables
const firebaseConfig = {
    apiKey: "AIzaSyCWk88OprZ1pe5QYJbkTgQY0Ao6n-uP1xw",
    authDomain: "asemi-authentication.firebaseapp.com",
    projectId: "asemi-authentication",
    storageBucket: "asemi-authentication.appspot.com",
    messagingSenderId: "1089232834079",
    appId: "1:1089232834079:web:ce2db2312c614f1b419e35"
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
