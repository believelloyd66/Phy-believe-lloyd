
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
    onSnapshot,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// ======================================
// 1. ELEMENTS AND SHARED VARIABLES
// ======================================

const logoutButton = document.getElementById("logoutButton");

const homeContainer = document.getElementById("homeAnnouncements");
const updatesContainer = document.getElementById("allAnnouncements");

let stopStudentAnnouncements = null;
let currentStudent = null;
let stopMySuggestions = null;

// SUGGESTION ELEMENTS

const suggestionForm =
    document.getElementById("suggestionForm");

const suggestionSubmit =
    document.getElementById("suggestionSubmit");

const suggestionMessage =
    document.getElementById("suggestionMessage");

const mySuggestions =
    document.getElementById("mySuggestions");


// ======================================
// 2. PAGE TITLES
// ======================================

const pageTitles = {
    home: "Welcome Home",
    updates: "Department Updates",
    courses: "Courses & Learning",
    gallery: "Department Gallery",
    suggestions: "Suggestion Box",
    settings: "Settings & Account"
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

    const announcementsQuery = query(
        collection(db, "announcements"),
        where("status", "==", "published")
    );

    if (stopStudentAnnouncements) {
        stopStudentAnnouncements();
    }

    stopStudentAnnouncements = onSnapshot(

        announcementsQuery,

        (snapshot) => {

            homeContainer.replaceChildren();
            updatesContainer.replaceChildren();

            if (snapshot.empty) {

                homeContainer.textContent =
                    "No announcements yet.";

                updatesContainer.textContent =
                    "No departmental announcements have been published yet.";

                return;
            }

            const announcements = snapshot.docs.map((documentSnapshot) => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            }));

            announcements.sort((a, b) => {

                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;

                return dateB - dateA;

            });

            announcements.forEach((data, index) => {

                updatesContainer.appendChild(
                    createStudentAnnouncement(data)
                );

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

            homeContainer.textContent =
                "Unable to load announcements. Please refresh.";

            updatesContainer.textContent =
                "Unable to load departmental updates. Please refresh.";

        }

    );

}


// ======================================
// 6. SUGGESTION STATUS
// ======================================

function getSuggestionStatus(status) {

    const statuses = {
        pending: "Pending",
        reviewing: "Under Review",
        considering: "Under Consideration",
        implemented: "Implemented",
        declined: "Declined"
    };

    return statuses[status] || "Pending";

}


// ======================================
// 7. DISPLAY STUDENT SUGGESTIONS
// ======================================

function displayMySuggestions(suggestions) {

    if (!mySuggestions) return;

    mySuggestions.replaceChildren();

    if (suggestions.length === 0) {

        const empty = document.createElement("div");
        empty.className = "empty";

        empty.textContent =
            "You haven't submitted any suggestions yet.";

        mySuggestions.appendChild(empty);

        return;

    }

    suggestions.forEach((suggestion) => {

        const card = document.createElement("div");
        card.className = "update-item";

        const category = document.createElement("span");
        category.className = "update-tag";
        category.textContent = suggestion.category || "GENERAL";

        const title = document.createElement("h3");
        title.textContent = suggestion.title || "Untitled suggestion";

        const description = document.createElement("p");
        description.textContent = suggestion.description || "";

        const status = document.createElement("div");
        status.className = "suggestion-status";

        status.textContent =
            "Status: " + getSuggestionStatus(suggestion.status);

        const date = document.createElement("div");
        date.className = "update-date";

        date.textContent = suggestion.createdAt?.toDate
            ? suggestion.createdAt.toDate().toLocaleString()
            : "Submission date unavailable";

        card.append(
            category,
            title,
            description,
            status,
            date
        );

        mySuggestions.appendChild(card);

    });

}


// ======================================
// 8. LOAD STUDENT SUBMISSIONS
// ======================================

function loadMySuggestions(user) {

    if (!mySuggestions) return;

    if (stopMySuggestions) {
        stopMySuggestions();
        stopMySuggestions = null;
    }

    mySuggestions.textContent =
        "Loading your suggestions...";

    const suggestionsQuery = query(
        collection(db, "suggestions"),
        where("userId", "==", user.uid)
    );

    stopMySuggestions = onSnapshot(

        suggestionsQuery,

        (snapshot) => {

            const suggestions = snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data()
            }));

            suggestions.sort((a, b) => {

                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;

                return dateB - dateA;

            });

            displayMySuggestions(suggestions);

        },

        (error) => {

            console.error(
                "Suggestion loading error:",
                error
            );

            mySuggestions.textContent =
                "Unable to load your suggestions. Please refresh.";

        }

    );

}


// ======================================
// 9. STUDENT AUTHENTICATION AND PROFILE
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

            alert(
                "Student profile not found. Please create a student account."
            );

            await signOut(auth);

            window.location.replace("login.html");
            return;

        }

        const profile = profileSnapshot.data();

        if (profile.platform !== "PHY EDU CONNECT") {

            alert(
                "This account does not have a PHY EDU CONNECT student profile."
            );

            await signOut(auth);

            window.location.replace("login.html");
            return;

        }

        const fullName =
            profile.fullName || user.displayName || "Student";

        // SET CURRENT STUDENT

        currentStudent = {
            uid: user.uid,
            fullName: fullName,
            email: user.email || ""
        };

        // LOAD PERSONAL SUGGESTIONS

        loadMySuggestions(user);

        // SUGGESTION PROFILE DISPLAY

        const suggestionUserName =
            document.getElementById("suggestionUserName");

        const suggestionAvatar =
            document.getElementById("suggestionAvatar");

        if (suggestionUserName) {
            suggestionUserName.textContent = fullName;
        }

        if (suggestionAvatar) {
            suggestionAvatar.textContent =
                fullName.charAt(0).toUpperCase();
        }

        // MAIN PROFILE DISPLAY

        const userName = document.getElementById("userName");
        const userAvatar = document.getElementById("userAvatar");

        const profileFullName =
            document.getElementById("profileFullName");

        const profileMatric =
            document.getElementById("profileMatric");

        const profileEmail =
            document.getElementById("profileEmail");

        const profilePhone =
            document.getElementById("profilePhone");

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

        // SETTINGS PAGE PROFILE DETAILS
        const settingsAvatar = document.getElementById("settingsAvatar");
        const settingsFullName = document.getElementById("settingsFullName");
        const settingsMatric = document.getElementById("settingsMatric");
        const settingsEmail = document.getElementById("settingsEmail");
        const settingsPhone = document.getElementById("settingsPhone");

        if (settingsAvatar) {
            settingsAvatar.textContent = fullName.charAt(0).toUpperCase();
        }

        if (settingsFullName) {
            settingsFullName.textContent = fullName;
        }

        if (settingsMatric) {
            settingsMatric.textContent = profile.matricNumber || "Not provided";
        }

        if (settingsEmail) {
            settingsEmail.textContent = profile.email || user.email || "Not provided";
        }

        if (settingsPhone) {
            settingsPhone.textContent = profile.phone || "Not provided";
        }

        // LOAD ANNOUNCEMENTS

        loadStudentAnnouncements();

    } catch (error) {

        console.error("Profile loading error:", error);

        alert(
            "We could not load your profile. Check your connection and refresh the page."
        );

    }

});

// ======================================
// 10. LOGOUT
// ======================================

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        try {

            // STOP ANNOUNCEMENT LISTENER

            if (stopStudentAnnouncements) {

                stopStudentAnnouncements();
                stopStudentAnnouncements = null;

            }

            // STOP SUGGESTION LISTENER

            if (stopMySuggestions) {

                stopMySuggestions();
                stopMySuggestions = null;

            }

            currentStudent = null;

            await signOut(auth);

            window.location.replace("login.html");

        } catch (error) {

            console.error("Logout error:", error);

            alert("Could not log out. Please try again.");

            logoutButton.disabled = false;
            const logoutLabel = logoutButton.querySelector(".logout-label");
            if (logoutLabel) logoutLabel.textContent = "Log Out";

        }

    });

}


// ======================================
// 11. DASHBOARD PAGE NAVIGATION
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
// 12. OPEN PAGE FROM URL HASH
// ======================================

function openPageFromHash() {

    const requestedPage =
        window.location.hash.substring(1);

    if (pageTitles[requestedPage]) {
        showPage(requestedPage);
    }

}

openPageFromHash();

window.addEventListener("hashchange", openPageFromHash);


// ======================================
// 13. NAVIGATION BUTTONS
// ======================================

document.querySelectorAll("[data-page]").forEach((button) => {

    button.addEventListener("click", () => {

        showPage(button.dataset.page);

    });

});


// ======================================
// 14. COURSE SEARCH
// ======================================

const courseSearch =
    document.getElementById("courseSearch");

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


// ======================================
// 15. SUBMIT SUGGESTION
// ======================================

if (suggestionForm) {

    suggestionForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!currentStudent) {

            alert("Your student account could not be verified.");
            return;

        }

        const category =
            document.getElementById("suggestionCategory").value;

        const title =
            document.getElementById("suggestionTitle").value.trim();

        const description =
            document.getElementById("suggestionDescription").value.trim();


        // VALIDATION

        if (!category || !title || !description) {

            suggestionMessage.textContent =
                "Please complete all fields.";

            return;

        }

        if (title.length < 3 || description.length < 10) {

            suggestionMessage.textContent =
                "The title must have at least 3 characters and the description at least 10.";

            return;

        }

        if (title.length > 100 || description.length > 2000) {

            suggestionMessage.textContent =
                "One of your entries exceeds the permitted length.";

            return;

        }


        // PREVENT MULTIPLE SUBMISSIONS

        suggestionSubmit.disabled = true;
        suggestionSubmit.textContent = "Submitting...";

        suggestionMessage.textContent = "";


        try {

            await addDoc(collection(db, "suggestions"), {

                userId: currentStudent.uid,

                fullName: currentStudent.fullName,

                email: currentStudent.email,

                category: category,

                title: title,

                description: description,

                status: "pending",

                createdAt: serverTimestamp()

            });


            // SUCCESS

            suggestionMessage.textContent =
                "Your suggestion has been submitted successfully.";

            suggestionMessage.style.color = "var(--green)";

            suggestionForm.reset();

        } catch (error) {

            console.error("Suggestion submission error:", error);

            suggestionMessage.textContent =
                "Unable to submit your suggestion. Please try again.";

            suggestionMessage.style.color = "#C0392B";

        } finally {

            suggestionSubmit.disabled = false;
            suggestionSubmit.textContent = "Submit Suggestion";

        }

    });

}
