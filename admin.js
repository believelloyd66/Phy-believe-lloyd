
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";


// ======================================
// 1. ADMIN CONFIGURATION
// ======================================

const ADMIN_EMAIL = "lloydbelieve66@gmail.com";


// ======================================
// 2. GET HTML ELEMENTS
// ======================================

const adminEmail = document.getElementById("adminEmail");
const adminName = document.getElementById("adminName");
const adminAvatar = document.getElementById("adminAvatar");
const settingsAdminEmail = document.getElementById("settingsAdminEmail");

const logoutBtn = document.getElementById("logoutBtn");

const announcementForm = document.getElementById("announcementForm");
const announcementTitle = document.getElementById("announcementTitle");
const announcementCategory = document.getElementById("announcementCategory");
const announcementMessage = document.getElementById("announcementMessage");

const publishBtn = document.getElementById("publishBtn");
const formMessage = document.getElementById("formMessage");

const announcementList = document.getElementById("announcementList");
const overviewAnnouncements = document.getElementById("overviewAnnouncements");
const announcementCount = document.getElementById("announcementCount");


// ======================================
// 3. ADMIN VARIABLES
// ======================================

let currentAdmin = null;
let stopAnnouncements = null;


// ======================================
// 4. FORMAT ANNOUNCEMENT DATE
// ======================================

function formatDate(timestamp) {

    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "Date unavailable";
    }

    return timestamp.toDate().toLocaleString();

}


// ======================================
// 5. CREATE ANNOUNCEMENT CARD
// ======================================

function createAnnouncementCard(data, documentId, allowDelete = false) {

    const card = document.createElement("div");
    card.className = "announcement";

    const category = document.createElement("span");
    category.className = "category";
    category.textContent = data.category || "General";

    const title = document.createElement("h3");
    title.textContent = data.title || "Untitled announcement";

    const message = document.createElement("p");
    message.textContent = data.message || "";

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = formatDate(data.createdAt);

    card.appendChild(category);
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(date);


    // DELETE BUTTON

    if (allowDelete) {

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete";
        deleteButton.textContent = "Delete announcement";

        deleteButton.addEventListener("click", async () => {

            const confirmed = confirm(
                "Are you sure you want to delete this announcement?"
            );

            if (!confirmed) return;

            deleteButton.disabled = true;
            deleteButton.textContent = "Deleting...";

            try {

                await deleteDoc(
                    doc(db, "announcements", documentId)
                );

            } catch (error) {

                console.error("Delete error:", error);

                alert("Unable to delete announcement: " + error.message);

                deleteButton.disabled = false;
                deleteButton.textContent = "Delete announcement";

            }

        });

        card.appendChild(deleteButton);

    }

    return card;

}


// ======================================
// 6. CHECK ADMINISTRATOR LOGIN
// ======================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.replace("login.html");
        return;

    }

    // CHECK ADMIN EMAIL

    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {

        alert("Access denied. Administrator permission required.");

        window.location.replace("dashboard.html");
        return;

    }

    currentAdmin = user;


    // ADMIN PROFILE

    const email = user.email || "Administrator";

    const name = user.displayName || email.split("@")[0];

    adminEmail.textContent = "Logged in as: " + email;

    adminName.textContent = name;

    adminAvatar.textContent = name.charAt(0).toUpperCase();

    settingsAdminEmail.textContent = email;


    // LOAD ANNOUNCEMENTS

    loadAnnouncements();

});


// ======================================
// 7. PUBLISH ANNOUNCEMENT
// ======================================

announcementForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!currentAdmin ||
        currentAdmin.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {

        formMessage.textContent =
            "Administrator verification is incomplete.";

        formMessage.style.color = "red";

        return;

    }

    const title = announcementTitle.value.trim();

    const category = announcementCategory.value;

    const message = announcementMessage.value.trim();


    if (!title || !category || !message) {

        formMessage.textContent = "Please complete all fields.";

        formMessage.style.color = "red";

        return;

    }


    publishBtn.disabled = true;

    publishBtn.textContent = "Publishing...";

    formMessage.textContent = "";


    try {

        await addDoc(collection(db, "announcements"), {

            title: title,

            category: category,

            message: message,

            status: "published",

            createdBy: currentAdmin.uid,

            createdAt: serverTimestamp()

        });


        announcementForm.reset();

        formMessage.textContent =
            "Announcement published successfully.";

        formMessage.style.color = "green";


    } catch (error) {

        console.error("Publishing error:", error);

        formMessage.textContent =
            "Publishing failed: " + error.message;

        formMessage.style.color = "red";

    } finally {

        publishBtn.disabled = false;

        publishBtn.textContent = "Publish Announcement";

    }

});


// ======================================
// 8. LOAD ANNOUNCEMENTS IN REAL TIME
// ======================================

function loadAnnouncements() {

    const announcementsRef = collection(db, "announcements");

    const announcementsQuery = query(
        announcementsRef,
        orderBy("createdAt", "desc")
    );


    if (stopAnnouncements) {

        stopAnnouncements();

    }


    stopAnnouncements = onSnapshot(

        announcementsQuery,

        (snapshot) => {

            announcementCount.textContent = snapshot.size;

            announcementList.replaceChildren();

            overviewAnnouncements.replaceChildren();


            if (snapshot.empty) {

                announcementList.innerHTML =
                    '<p class="empty">No announcements have been published yet.</p>';

                overviewAnnouncements.innerHTML =
                    '<p class="empty">No recent announcements yet.</p>';

                return;

            }


            let recentNumber = 0;


            snapshot.forEach((documentSnapshot) => {

                const data = documentSnapshot.data();

                const documentId = documentSnapshot.id;


                // FULL ANNOUNCEMENT LIST

                const fullCard = createAnnouncementCard(
                    data,
                    documentId,
                    true
                );

                announcementList.appendChild(fullCard);


                // THREE LATEST ANNOUNCEMENTS

                if (recentNumber < 3) {

                    const recentCard = createAnnouncementCard(
                        data,
                        documentId,
                        false
                    );

                    overviewAnnouncements.appendChild(recentCard);

                    recentNumber++;

                }

            });

        },


        (error) => {

            console.error("Announcement loading error:", error);

            announcementList.textContent =
                "Unable to load announcements: " + error.message;

            overviewAnnouncements.textContent =
                "Unable to load recent announcements.";

        }

    );

}


// ======================================
// 9. LOGOUT
// ======================================

logoutBtn.addEventListener("click", async () => {

    logoutBtn.disabled = true;

    logoutBtn.textContent = "Logging out...";


    try {

        if (stopAnnouncements) {

            stopAnnouncements();

        }

        await signOut(auth);

        window.location.replace("login.html");


    } catch (error) {

        console.error("Logout error:", error);

        alert("Unable to log out. Please try again.");

        logoutBtn.disabled = false;

        logoutBtn.textContent = "Logout";

    }

});
