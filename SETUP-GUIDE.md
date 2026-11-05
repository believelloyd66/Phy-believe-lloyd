# PHY EDU CONNECT — Login and Signup Setup

This version reuses the login and signup visual designs from the old fashion project and connects them to the existing Firebase project.

## Files updated

- `signup.html` — student registration form (full name, matriculation number, email, phone, password).
- `js/signup.js` — creates a Firebase Authentication account and saves the student's profile in Firestore.
- `login.html` — existing login design retained.
- `js/login.js` — signs students in and sends them to `dashboard.html`.
- `dashboard.html` — now requires a signed-in PHY EDU CONNECT account and displays the saved student profile.
- `firebase-config.js` — your existing Firebase project configuration is retained.

## 1. Check Firebase Authentication

1. Open the Firebase Console for the project `fashion-service-co`.
2. Open **Build → Authentication → Sign-in method**.
3. Make sure **Email/Password** is enabled.

## 2. Set Firestore security rules

Open **Build → Firestore Database → Rules** and review the existing rules before replacing them. If the old fashion project has data you still need, back it up first.

For this first student-profile version, these rules let each signed-in student create and read only their own profile document:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow create: if request.auth != null
                    && request.auth.uid == userId
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.platform == "PHY EDU CONNECT";

      allow read: if request.auth != null
                  && request.auth.uid == userId;

      allow update: if request.auth != null
                    && request.auth.uid == userId;

      allow delete: if false;
    }
  }
}
```

These are starter rules for this simple profile system. If you later add admin publishing, profile editing, or other collections, those features will need their own carefully designed rules. Do not use public read/write rules such as `allow read, write: if true`.

## 3. Upload the whole folder

Keep the folder structure exactly as it is:

```text
physics education web setup/
├── index.html
├── signup.html
├── login.html
├── dashboard.html
├── firebase-config.js
└── js/
    ├── signup.js
    └── login.js
```

Upload the complete folder to your web host. Do not open the HTML directly as a `file://` file; Firebase module imports need to run from a website served over HTTP/HTTPS. A hosted HTTPS address such as your Netlify site is suitable.

## 4. Test the flow

1. Open your website's `signup.html`.
2. Create a test student account using an email you can access.
3. After successful registration, the site should open `dashboard.html`.
4. The dashboard should show the student's saved name, matriculation number, email, and phone number.
5. Log out, then log in again using the same email and password.
6. Confirm the same profile appears.

## Important notes

- The password is handled by Firebase Authentication. It is not written into the Firestore profile document.
- Profile data is stored in Firestore under `users/{Firebase user UID}`.
- Firebase's local browser persistence keeps the login session on that browser until the user signs out or clears site data.
- The Firebase project is still named `fashion-service-co`. This code tags new profiles as `PHY EDU CONNECT` and rejects old fashion profiles at login. The old Firebase accounts and data are not automatically deleted.
- Firebase client configuration is visible in browser code by design. Protect data with Firebase Authentication and Firestore Security Rules, not by trying to hide the config.
- Registration currently does not send an email notification to an administrator. Password reset uses Firebase's password-reset email.
