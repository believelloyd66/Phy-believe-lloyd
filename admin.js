
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
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";


// ======================================
// 1. GET HTML ELEMENTS
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


// STUDENT ELEMENTS

const studentCount = document.getElementById("studentCount");
const studentDirectoryCount = document.getElementById("studentDirectoryCount");
const studentSearch = document.getElementById("studentSearch");
const studentList = document.getElementById("studentList");
const studentMessage = document.getElementById("studentMessage");


// ======================================
// 2. ADMIN VARIABLES
// ======================================

let currentAdmin = null;

let stopAnnouncements = null;
let stopStudents = null;

let allStudents = [];


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

            // GET STUDENT RECORDS

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


    // TABLE HEADER

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


    // TABLE BODY

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


// SEARCH INPUT EVENT

studentSearch.addEventListener("input", filterStudents);


// ======================================
// 11. LOGOUT
// ======================================

logoutBtn.addEventListener("click", async () => {

    logoutBtn.disabled = true;

    logoutBtn.textContent = "Logging out...";


    try {

        if (stopAnnouncements) {

            stopAnnouncements();

        }

        if (stopStudents) {

            stopStudents();

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
