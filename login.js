import { auth, db } from "../firebase-config.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const form = document.getElementById("loginForm");
const button = document.getElementById("loginButton");
const message = document.getElementById("loginMessage");

function show(text, type = "error") {
  message.textContent = text;
  message.className = `message show ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = "Logging in...";

  try {
    await setPersistence(auth, browserLocalPersistence);

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getDoc(doc(db, "users", credential.user.uid));

    if (!profile.exists() || profile.data().platform !== "PHY EDU CONNECT") {
      show("This account does not have a PHY EDU CONNECT student profile. Please create a new account.");
      return;
    }

    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Login error:", error);

    if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      show("The email or password is incorrect.");
    } else if (error.code === "auth/too-many-requests") {
      show("Too many attempts. Wait a little and try again.");
    } else {
      show("Unable to log in. Check your details and internet connection.");
    }
  } finally {
    button.disabled = false;
    button.textContent = "Log In";
  }
});

document.getElementById("forgotPasswordLink").addEventListener("click", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();

  if (!email) {
    show("Enter your email address first.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    show("If an account exists for that email, a password-reset email has been sent.", "success");
  } catch (error) {
    console.error("Password reset error:", error);
    show("Could not send the reset email. Check the email address and try again.");
  }
});
