
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// ======================================
// 1. ELEMENTS
// ======================================

const logoutButton = document.getElementById("logoutButton");

const homeContainer = document.getElementById("homeAnnouncements");
const updatesContainer = document.getElementById("allAnnouncements");

let stopStudentAnnouncements = null;


// ======================================
// 2. PAGE TITLES
// ======================================

const pageTitles = {
    home: "Welcome Home",
    updates: "Department Updates",
    courses: "Courses & Learning",
    gallery: "Department Gallery"
};


// ======================================
// 3. ANNOUNCEMENT DATE FORMAT
// ======================================

function formatAnnouncementDate(timestamp) {

    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "Date unavailable";
    }

    return timestamp.toDate().toLocaleString();

}


// ======================================
// 4. CREATE ANNOUNCEMENT ELEMENT
// ======================================

function createStudentAnnouncement(data) {

    const item = document.createElement("div");
    item.className = "update-item";

    const category = document.createElement("span");
    category.className = "update-tag";
    category.textContent = data.category || "GENERAL";

    const title = document.createElement("h3");
    title.textContent = data.title || "Untitled announcement";

    const message = document.createElement("p");
    message.textContent = data.message || "";

    const date = document.createElement("div");
    date.className = "update-date";
    date.textContent = formatAnnouncementDate(data.createdAt);

    item.appendChild(category);
    item.appendChild(title);
    item.appendChild(message);
    item.appendChild(date);

    return item;

}


// ======================================
// 5. LOAD STUDENT ANNOUNCEMENTS
// ======================================

function loadStudentAnnouncements() {

    if (!homeContainer || !updatesContainer) {
        console.error("Announcement containers were not found.");
        return;
    }

    // Fetch only published announcements.
    // No orderBy means no composite index is needed.

    const announcementsQuery = query(
        collection(db, "announcements"),
        where("status", "==", "published")
    );

    // Stop any previous listener.

    if (stopStudentAnnouncements) {
        stopStudentAnnouncements();
    }

    stopStudentAnnouncements = onSnapshot(

        announcementsQuery,

        (snapshot) => {

            homeContainer.replaceChildren();
            updatesContainer.replaceChildren();

            // Check whether announcements exist.

            if (snapshot.empty) {

                homeContainer.innerHTML =
                    '<div class="empty">No announcements yet.</div>';

                updatesContainer.innerHTML =
                    '<div class="empty">No departmental announcements have been published yet.</div>';

                return;
            }

            // Convert Firestore documents into an array.

            const announcements = snapshot.docs.map((documentSnapshot) => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            }));

            // Sort announcements from newest to oldest.

            announcements.sort((a, b) => {

                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;

                return dateB - dateA;

            });

            // Display announcements.

            announcements.forEach((data, index) => {

                // Display every announcement on Updates.

                updatesContainer.appendChild(
                    createStudentAnnouncement(data)
                );

                // Display only the latest three on Home.

                if (index < 3) {

                    homeContainer.appendChild(
                        createStudentAnnouncement(data)
                    );

                }

            });

        },

        (error) => {

            console.error(
                "Student announcement loading error:",
                error
            );

            console.error("Firestore error code:", error.code);

            homeContainer.textContent =
                "Unable to load announcements. Please refresh.";

            updatesContainer.textContent =
                "Unable to load departmental updates. Please refresh.";

        }

    );

}


// ======================================
// 6. CHECK STUDENT LOGIN AND LOAD PROFILE
// ======================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.replace("login.html");
        return;

    }

    try {

        const profileSnapshot = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!profileSnapshot.exists()) {

            alert("Student profile not found. Please create a student account.");

            await signOut(auth);

            window.location.replace("login.html");
            return;

        }

        const profile = profileSnapshot.data();

        if (profile.platform !== "PHY EDU CONNECT") {

            alert("This account does not have a PHY EDU CONNECT student profile.");

            await signOut(auth);

            window.location.replace("login.html");
            return;

        }

        // Get student name.

        const fullName =
            profile.fullName || user.displayName || "Student";

        // Display student information.

        const userName = document.getElementById("userName");
        const userAvatar = document.getElementById("userAvatar");

        const profileFullName = document.getElementById("profileFullName");
        const profileMatric = document.getElementById("profileMatric");
        const profileEmail = document.getElementById("profileEmail");
        const profilePhone = document.getElementById("profilePhone");

        if (userName) {
            userName.textContent = fullName;
        }

        if (userAvatar) {
            userAvatar.textContent =
                fullName.charAt(0).toUpperCase();
        }

        if (profileFullName) {
            profileFullName.textContent = fullName;
        }

        if (profileMatric) {
            profileMatric.textContent =
                profile.matricNumber || "Not provided";
        }

        if (profileEmail) {
            profileEmail.textContent =
                profile.email || user.email || "Not provided";
        }

        if (profilePhone) {
            profilePhone.textContent =
                profile.phone || "Not provided";
        }

        // Load announcements after confirming the student profile.

        loadStudentAnnouncements();

    } catch (error) {

        console.error("Profile loading error:", error);

        alert(
            "We could not load your profile. Check your connection and refresh the page."
        );

    }

});


// ======================================
// 7. LOGOUT
// ======================================

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        try {

            if (stopStudentAnnouncements) {

                stopStudentAnnouncements();
                stopStudentAnnouncements = null;

            }

            await signOut(auth);

            window.location.replace("login.html");

        } catch (error) {

            console.error("Logout error:", error);

            alert("Could not log out. Please try again.");

            logoutButton.disabled = false;
            logoutButton.textContent = "Log Out";

        }

    });

}


// ======================================
// 8. DASHBOARD PAGE NAVIGATION
// ======================================

function showPage(page) {

    const views = document.querySelectorAll(".view");

    views.forEach((view) => {
        view.classList.remove("active");
    });

    const selectedPage = document.getElementById(page);

    if (!selectedPage) {
        return;
    }

    selectedPage.classList.add("active");

    const pageTitle = document.getElementById("pageTitle");

    if (pageTitle) {
        pageTitle.textContent =
            pageTitles[page] || "PHY EDU CONNECT";
    }

    document.querySelectorAll("[data-page]").forEach((button) => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );

    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}

window.showPage = showPage;


// ======================================
// 9. NAVIGATION BUTTONS
// ======================================

document.querySelectorAll("[data-page]").forEach((button) => {

    button.addEventListener("click", () => {

        showPage(button.dataset.page);

    });

});


// ======================================
// 10. COURSE SEARCH
// ======================================

const courseSearch = document.getElementById("courseSearch");

if (courseSearch) {

    courseSearch.addEventListener("input", function () {

        const searchValue = this.value.toLowerCase();

        document.querySelectorAll(".course-card").forEach((card) => {

            const content = card.textContent.toLowerCase();

            card.style.display =
                content.includes(searchValue) ? "block" : "none";

        });

    });

}
