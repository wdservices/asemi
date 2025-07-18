
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration using Environment Variables
const firebaseConfig = {
    apiKey: "AIzaSyBwRPeVNKY1ldbQe7TjJ-0Ynl7H5HDZ5zU",
    authDomain: "asemi-c7777.firebaseapp.com",
    projectId: "asemi-c7777",
    storageBucket: "asemi-c7777.firebasestorage.app",
    messagingSenderId: "207342481965",
    appId: "1:207342481965:web:9ae885989fa948ad90fea4"
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
