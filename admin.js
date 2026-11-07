
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";


// ======================================
// 1. GET HTML ELEMENTS
// ======================================

// ADMIN PROFILE

const adminEmail = document.getElementById("adminEmail");
const adminName = document.getElementById("adminName");
const adminAvatar = document.getElementById("adminAvatar");
const settingsAdminEmail = document.getElementById("settingsAdminEmail");

const logoutBtn = document.getElementById("logoutBtn");


// ANNOUNCEMENT ELEMENTS

const announcementForm = document.getElementById("announcementForm");
const announcementTitle = document.getElementById("announcementTitle");
const announcementCategory = document.getElementById("announcementCategory");
const announcementMessage = document.getElementById("announcementMessage");

const publishBtn = document.getElementById("publishBtn");
const formMessage = document.getElementById("formMessage");

const announcementList = document.getElementById("announcementList");
const overviewAnnouncements = document.getElementById("overviewAnnouncements");
const announcementCount = document.getElementById("announcementCount");


// STUDENT ELEMENTS

const studentCount = document.getElementById("studentCount");
const studentDirectoryCount = document.getElementById("studentDirectoryCount");
const studentSearch = document.getElementById("studentSearch");
const studentList = document.getElementById("studentList");
const studentMessage = document.getElementById("studentMessage");


// SUGGESTION ELEMENTS

const suggestionCount = document.getElementById("suggestionCount");
const suggestionFilter = document.getElementById("suggestionFilter");
const adminSuggestionList = document.getElementById("adminSuggestionList");
const suggestionAdminMessage = document.getElementById("suggestionAdminMessage");


// ======================================
// 2. ADMIN VARIABLES
// ======================================

let currentAdmin = null;

let stopAnnouncements = null;
let stopStudents = null;
let stopSuggestions = null;

let allStudents = [];
let allSuggestions = [];


// ======================================
// 3. FORMAT DATES
// ======================================

function formatDate(timestamp) {

    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "Date unavailable";
    }

    return timestamp.toDate().toLocaleString();

}


function formatStudentDate(timestamp) {

    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "Date unavailable";
    }

    return timestamp.toDate().toLocaleDateString();

}


// ======================================
// 4. CREATE ANNOUNCEMENT CARD
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

    card.append(category, title, message, date);


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
// 5. CHECK ADMINISTRATOR LOGIN
// ======================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.replace("login.html");
        return;

    }

    try {

        const adminRef = doc(db, "admins", user.uid);

        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists() || adminSnap.data().role !== "admin") {

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


        // LOAD ADMIN DATA

        loadAnnouncements();

        loadStudents();

        loadSuggestions();

    } catch (error) {

        console.error("Admin verification error:", error);

        adminEmail.textContent =
            "Unable to verify administrator access. Check your connection and refresh.";

    }

});


// ======================================
// 6. PUBLISH ANNOUNCEMENT
// ======================================

announcementForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!currentAdmin) {

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
// 7. LOAD ANNOUNCEMENTS IN REAL TIME
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


                const fullCard = createAnnouncementCard(
                    data,
                    documentId,
                    true
                );

                announcementList.appendChild(fullCard);


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
// 8. LOAD REGISTERED STUDENTS
// ======================================

function loadStudents() {

    if (stopStudents) {
        stopStudents();
    }

    studentList.innerHTML =
        '<p class="empty">Loading registered students...</p>';

    const usersRef = collection(db, "users");


    stopStudents = onSnapshot(

        usersRef,

        (snapshot) => {

            allStudents = snapshot.docs.map(documentSnapshot => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            }));


            // SORT NEWEST FIRST

            allStudents.sort((a, b) => {

                const dateA = a.createdAt?.toMillis?.() || 0;

                const dateB = b.createdAt?.toMillis?.() || 0;

                return dateB - dateA;

            });


            // UPDATE BOTH STUDENT COUNTS

            studentCount.textContent = allStudents.length;

            studentDirectoryCount.textContent = allStudents.length;


            // DISPLAY STUDENTS

            filterStudents();

            studentMessage.textContent = "";

        },


        (error) => {

            console.error("Student loading error:", error);

            studentList.textContent =
                "Unable to load students: " + error.message;

            studentMessage.textContent =
                "Check your Firestore permissions and internet connection.";

            studentMessage.style.color = "red";

        }

    );

}


// ======================================
// 9. DISPLAY STUDENTS
// ======================================

function displayStudents(students) {

    studentList.replaceChildren();


    if (students.length === 0) {

        const empty = document.createElement("div");

        empty.className = "empty";

        empty.textContent = allStudents.length === 0
            ? "No registered student profiles found yet."
            : "No students match your search.";

        studentList.appendChild(empty);

        return;

    }


    const wrapper = document.createElement("div");

    wrapper.className = "student-table-wrap";


    const table = document.createElement("table");

    table.className = "student-table";


    const headers = [
        "Full Name",
        "Matric Number",
        "Email",
        "Phone",
        "Department",
        "Date Registered"
    ];

    const thead = document.createElement("thead");

    const headerRow = document.createElement("tr");


    headers.forEach(header => {

        const th = document.createElement("th");

        th.textContent = header;

        headerRow.appendChild(th);

    });


    thead.appendChild(headerRow);

    table.appendChild(thead);


    const tbody = document.createElement("tbody");


    students.forEach(student => {

        const row = document.createElement("tr");


        const values = [

            student.fullName,

            student.matricNumber,

            student.email,

            student.phone,

            student.department,

            formatStudentDate(student.createdAt)

        ];


        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value || "Not provided";

            row.appendChild(cell);

        });


        tbody.appendChild(row);

    });


    table.appendChild(tbody);

    wrapper.appendChild(table);

    studentList.appendChild(wrapper);

}


// ======================================
// 10. SEARCH AND FILTER STUDENTS
// ======================================

function filterStudents() {

    const searchValue = studentSearch.value
        .toLowerCase()
        .trim();


    const filteredStudents = allStudents.filter(student => {

        const fullName = (student.fullName || "").toLowerCase();

        const matricNumber = (student.matricNumber || "").toLowerCase();

        const email = (student.email || "").toLowerCase();

        const phone = (student.phone || "").toLowerCase();

        const department = (student.department || "").toLowerCase();


        return (

            fullName.includes(searchValue) ||

            matricNumber.includes(searchValue) ||

            email.includes(searchValue) ||

            phone.includes(searchValue) ||

            department.includes(searchValue)

        );

    });


    displayStudents(filteredStudents);

}


studentSearch.addEventListener("input", filterStudents);


// ======================================
// 11. SUGGESTION MANAGEMENT
// ======================================

const suggestionStatuses = {

    pending: "Pending",

    reviewing: "Under Review",

    considering: "Under Consideration",

    implemented: "Implemented",

    declined: "Declined"

};


// LOAD SUGGESTIONS IN REAL TIME

function loadSuggestions() {

    if (stopSuggestions) {

        stopSuggestions();

        stopSuggestions = null;

    }


    adminSuggestionList.innerHTML =
        '<div class="empty">Loading suggestions...</div>';


    const suggestionsQuery = query(

        collection(db, "suggestions"),

        orderBy("createdAt", "desc")

    );


    stopSuggestions = onSnapshot(

        suggestionsQuery,

        (snapshot) => {

            allSuggestions = snapshot.docs.map(item => ({

                id: item.id,

                ...item.data()

            }));


            suggestionCount.textContent = allSuggestions.length;


            displayAdminSuggestions(allSuggestions);

        },


        (error) => {

            console.error("Suggestion loading error:", error);

            adminSuggestionList.textContent =
                "Unable to load suggestions: " + error.message;

            suggestionAdminMessage.textContent =
                "Check your Firestore permissions and connection.";

            suggestionAdminMessage.style.color = "red";

        }

    );

}


// DISPLAY SUGGESTIONS

function displayAdminSuggestions(suggestions) {

    adminSuggestionList.replaceChildren();


    const selectedFilter = suggestionFilter.value;


    const filteredSuggestions = suggestions.filter(suggestion => {

        return selectedFilter === "all"
            || (suggestion.status || "pending") === selectedFilter;

    });


    if (filteredSuggestions.length === 0) {

        const empty = document.createElement("div");

        empty.className = "empty";

        empty.textContent = suggestions.length === 0
            ? "No student suggestions have been submitted yet."
            : "No suggestions match this filter.";

        adminSuggestionList.appendChild(empty);

        return;

    }


    filteredSuggestions.forEach(suggestion => {

        const card = document.createElement("div");

        card.className = "admin-suggestion";


        // CATEGORY

        const category = document.createElement("span");

        category.className = "category";

        category.textContent = suggestion.category || "General";


        // TITLE

        const title = document.createElement("h3");

        title.textContent = suggestion.title || "Untitled suggestion";


        // DESCRIPTION

        const description = document.createElement("p");

        description.textContent =
            suggestion.description || "No description provided.";


        // STUDENT NAME

        const student = document.createElement("div");

        student.className = "suggestion-meta";

        student.textContent =
            "Submitted by: " + (suggestion.fullName || "Unknown student");


        // STUDENT EMAIL

        const email = document.createElement("div");

        email.className = "suggestion-meta";

        email.textContent =
            "Email: " + (suggestion.email || "Not provided");


        // SUBMISSION DATE

        const date = document.createElement("div");

        date.className = "suggestion-meta";

        date.textContent =
            "Submitted: " + formatDate(suggestion.createdAt);


        // CURRENT STATUS

        const status = document.createElement("span");

        status.className = "suggestion-status-label";

        status.textContent =
            suggestionStatuses[suggestion.status] || "Pending";


        // ACTIONS CONTAINER

        const actions = document.createElement("div");

        actions.className = "suggestion-actions";


        // STATUS SELECTOR

        const statusSelect = document.createElement("select");

        statusSelect.setAttribute(
            "aria-label",
            "Change suggestion status"
        );


        const currentStatus = suggestion.status || "pending";


        Object.entries(suggestionStatuses).forEach(([value, label]) => {

            const option = document.createElement("option");

            option.value = value;

            option.textContent = label;

            option.selected = currentStatus === value;

            statusSelect.appendChild(option);

        });


        // UPDATE STATUS

        statusSelect.addEventListener("change", async () => {

            const previousStatus = currentStatus;

            const newStatus = statusSelect.value;

            statusSelect.disabled = true;


            try {

                await updateDoc(

                    doc(db, "suggestions", suggestion.id),

                    {
                        status: newStatus
                    }

                );


                suggestionAdminMessage.textContent =
                    "Suggestion status updated successfully.";

                suggestionAdminMessage.style.color = "green";


            } catch (error) {

                console.error("Status update error:", error);

                suggestionAdminMessage.textContent =
                    "Unable to update status: " + error.message;

                suggestionAdminMessage.style.color = "red";

                statusSelect.value = previousStatus;

            } finally {

                statusSelect.disabled = false;

            }

        });


        // DELETE BUTTON

        const deleteButton = document.createElement("button");

        deleteButton.className = "suggestion-delete";

        deleteButton.textContent = "Delete";


        deleteButton.addEventListener("click", async () => {

            const confirmed = confirm(
                "Are you sure you want to permanently delete this suggestion?"
            );

            if (!confirmed) return;


            deleteButton.disabled = true;

            deleteButton.textContent = "Deleting...";


            try {

                await deleteDoc(

                    doc(db, "suggestions", suggestion.id)

                );


                suggestionAdminMessage.textContent =
                    "Suggestion deleted successfully.";

                suggestionAdminMessage.style.color = "green";


            } catch (error) {

                console.error("Suggestion deletion error:", error);

                suggestionAdminMessage.textContent =
                    "Unable to delete suggestion: " + error.message;

                suggestionAdminMessage.style.color = "red";

                deleteButton.disabled = false;

                deleteButton.textContent = "Delete";

            }

        });


        actions.append(statusSelect, deleteButton);


        // BUILD CARD

        card.append(

            category,

            title,

            description,

            student,

            email,

            date,

            status,

            actions

        );


        adminSuggestionList.appendChild(card);

    });

}


// FILTER SUGGESTIONS

suggestionFilter.addEventListener("change", () => {

    displayAdminSuggestions(allSuggestions);

});


// ======================================
// 12. LOGOUT
// ======================================

logoutBtn.addEventListener("click", async () => {

    logoutBtn.disabled = true;

    logoutBtn.textContent = "Logging out...";


    try {

        if (stopAnnouncements) {
            stopAnnouncements();
            stopAnnouncements = null;
        }

        if (stopStudents) {
            stopStudents();
            stopStudents = null;
        }

        if (stopSuggestions) {
            stopSuggestions();
            stopSuggestions = null;
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
