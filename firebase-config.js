
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnupVYb2xjq-2TXq0XYi_Cu1GOnAOYCc4",
  authDomain: "fashion-service-co.firebaseapp.com",
  projectId: "fashion-service-co",
  storageBucket: "fashion-service-co.firebasestorage.app",
  messagingSenderId: "180433662257",
  appId: "1:180433662257:web:e30b10050a6356ce508010"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
