
import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const ADMIN_EMAIL = "lloydbelieve66@gmail.com";

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

    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = credential.user;

    // FIRST: CHECK ADMIN EMAIL
    if (user.email?.toLowerCase() === ADMIN_EMAIL) {
      window.location.href = "admin.html";
      return;
    }

    // SECOND: CHECK STUDENT PROFILE
    const studentRef = doc(db, "users", user.uid);
    const studentProfile = await getDoc(studentRef);

    if (
      studentProfile.exists() &&
      studentProfile.data().platform === "PHY EDU CONNECT"
    ) {
      window.location.href = "dashboard.html";
      return;
    }

    await signOut(auth);

    show("This account does not have a valid PHY EDU CONNECT profile.");

  } catch (error) {
    console.error("Login error:", error);

    if (error.code === "auth/invalid-credential") {
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
