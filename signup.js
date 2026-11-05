import { auth, db } from "../firebase-config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const form = document.getElementById("signupForm");
const button = document.getElementById("submitButton");
const message = document.getElementById("signupMessage");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message show ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const matricNumber = document.getElementById("matricNumber").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!fullName || !matricNumber || !email || !phone) {
    showMessage("Please complete all the fields.");
    return;
  }

  if (password.length < 8) {
    showMessage("Your password must contain at least 8 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Your passwords do not match.");
    return;
  }

  button.disabled = true;
  button.textContent = "Creating account...";

  try {
    await setPersistence(auth, browserLocalPersistence);

    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credential.user, { displayName: fullName });

    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      fullName,
      matricNumber,
      email,
      phone,
      department: "Physics Education",
      platform: "PHY EDU CONNECT",
      createdAt: serverTimestamp()
    });

    showMessage("Account created. Opening your dashboard...", "success");
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Signup error:", error);

    if (error.code === "auth/email-already-in-use") {
      showMessage("An account already exists with this email. Please log in.");
    } else if (error.code === "auth/invalid-email") {
      showMessage("Enter a valid email address.");
    } else if (error.code === "auth/weak-password") {
      showMessage("Choose a stronger password with at least 8 characters.");
    } else if (error.code === "permission-denied") {
      showMessage("Your account was created, but the profile could not be saved. Check your Firestore rules before trying again.");
    } else {
      showMessage("Registration could not be completed. Check your internet connection and try again.");
    }
  } finally {
    button.disabled = false;
    button.textContent = "Create Account";
  }
});
