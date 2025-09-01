// Firebase Project Configuration
// Project: theeplreview
// Project ID: theeplreview-18b04
// Project Number: 733614860861

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByKGZpohHaK0N9YAHqm7Vje0A9udcwYQA",
  authDomain: "theeplreview-18b04.firebaseapp.com",
  projectId: "theeplreview-18b04",
  storageBucket: "theeplreview-18b04.firebasestorage.app",
  messagingSenderId: "733614860861",
  appId: "1:733614860861:web:a7251ecf0cecd7d7665854"
};

// Initialize Firebase
import { initializeApp } from "firebase/app";
const app = initializeApp(firebaseConfig);

export { firebaseConfig, app };
