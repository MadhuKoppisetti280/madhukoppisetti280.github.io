// Data Structures
let voters = JSON.parse(localStorage.getItem('voters')) || {};
let candidates = JSON.parse(localStorage.getItem('candidates')) || [];
let votingOpen = JSON.parse(localStorage.getItem('votingOpen')) || false;
let currentUser = null; // Stores the logged-in user's ID
let userRole = null;    // 'student' or 'admin'

// DOM Elements
const loginPage = document.getElementById('login-page');
const studentDashboard = document.getElementById('student-dashboard');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const adminLoginBtn = document.getElementById('admin-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const errorMsg = document.getElementById('error-message');
const mainNav = document.getElementById('main-nav');
const adminMainNav = document.getElementById('admin-main-nav');
const menuToggle = document.getElementById('menu-toggle');
const adminMenuToggle = document.getElementById('admin-menu-toggle');
const loadingSpinner = document.getElementById('loading-spinner');
const userInfo = document.getElementById('user-info');
const adminInfo = document.getElementById('admin-info');
const candidatesContainer = document.getElementById('candidates-container');
const submitVoteBtn = document.getElementById('submit-vote-btn');
const voteInfoMessage = document.getElementById('vote-info-message');
const addCandidateForm = document.getElementById('add-candidate-form');
const adminCandidatesTableBody = document.getElementById('admin-candidates-table-body');
const toggleVotingBtn = document.getElementById('toggle-voting-btn');
const votingStatusText = document.getElementById('voting-status-text');
const voterSummary = document.getElementById('voter-summary');
const votersTableBody = document.getElementById('voters-table-body');
const changePasswordForm = document.getElementById('change-password-form');
const messageBox = document.getElementById('message-box');
const messageOkBtn = document.getElementById('message-ok');

// Chart.js instances
let studentResultsChart = null;
let adminResultsChart = null;

// Constants
const ADMIN_ID = 'admin';
const ADMIN_PASSWORD = 'Admin123';

// Helper Functions
function saveToLocalStorage() {
    localStorage.setItem('voters', JSON.stringify(voters));
    localStorage.setItem('candidates', JSON.stringify(candidates));
    localStorage.setItem('votingOpen', JSON.stringify(votingOpen));
}

function showPage(pageId, type) {
    if (!pageId) {
        console.error("Page ID is undefined. Skipping page transition.");
        return;
    }
    const dashboardId = type === 'student' ? 'student-dashboard' : 'admin-dashboard';
    const dashboard = document.getElementById(dashboardId);
    if (!dashboard) return;

    const pages = dashboard.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('hidden'));

    const pageToShow = document.getElementById(pageId);
    if (pageToShow) {
        pageToShow.classList.remove('hidden');
    } else {
        console.error(`Page with ID ${pageId} not found.`);
    }

    const nav = document.getElementById(type === 'student' ? 'main-nav' : 'admin-main-nav');
    if (!nav) return;
    const navLinks = nav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function showDashboard(role) {
    loginPage.classList.add('hidden');
    if (role === 'student') {
        studentDashboard.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
        showPage('home-page', 'student');
        userInfo.textContent = `Logged in as: ${currentUser}`;
        renderVotePage();
    } else if (role === 'admin') {
        studentDashboard.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        showPage('admin-candidates', 'admin');
        adminInfo.textContent = `Logged in as: ${currentUser}`;
        renderAdminCandidates();
        updateVotingStatus();
    }
}

function showLogin() {
    loginPage.classList.remove('hidden');
    studentDashboard.classList.add('hidden');
    adminDashboard.classList.add('hidden');
    document.getElementById('student-id').value = '';
    document.getElementById('password').value = '';
    errorMsg.classList.add('hidden');
    currentUser = null;
    userRole = null;
}

function showMessageBox(title, text) {
    document.getElementById('message-title').textContent = title;
    document.getElementById('message-text').textContent = text;
    messageBox.classList.remove('hidden');
}

messageOkBtn.addEventListener('click', () => {
    messageBox.classList.add('hidden');
});

// Student Dashboard Functions
function renderVotePage() {
    candidatesContainer.innerHTML = '';
    const voter = voters[currentUser];

    if (!votingOpen) {
        voteInfoMessage.textContent = 'Voting is currently closed. Please check back later.';
        voteInfoMessage.className = 'vote-message vote-error';
        voteInfoMessage.classList.remove('hidden');
        submitVoteBtn.disabled = true;
        return;
    }

    if (voter && voter.hasVoted) {
        voteInfoMessage.textContent = 'You have already cast your vote. Thank you!';
        voteInfoMessage.className = 'vote-message vote-success';
        voteInfoMessage.classList.remove('hidden');
        submitVoteBtn.disabled = true;
        return;
    }

    voteInfoMessage.classList.add('hidden');
    submitVoteBtn.disabled = false;

    candidates.forEach(candidate => {
        const card = document.createElement('label');
        card.htmlFor = `candidate-${candidate.id}`;
        card.className = `candidate-card relative flex flex-col items-center justify-center p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-200`;
        card.innerHTML = `
            <input type="radio" id="candidate-${candidate.id}" name="candidate" value="${candidate.id}" class="absolute top-4 left-4 h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500">
            <div class="mt-2 text-xl font-semibold text-gray-800">${candidate.name}</div>
        `;
        card.addEventListener('click', () => {
            document.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
        candidatesContainer.appendChild(card);
    });
}

function renderResults(chartId, tableId) {
    const chartCanvas = document.getElementById(chartId);
    const tableBody = document.getElementById(tableId);

    const candidateNames = candidates.map(c => c.name);
    const voteCounts = candidates.map(c => c.votes);
    const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);

    // Chart colors for the doughnut chart
    const chartColors = [
        '#4f46e5', // Indigo
        '#22c55e', // Green
        '#ef4444', // Red
        '#f97316', // Orange
        '#a855f7', // Purple
        '#14b8a6', // Teal
        '#eab308'  // Yellow
    ];

    if (chartId === 'results-chart') {
        if (studentResultsChart) { studentResultsChart.destroy(); }
        studentResultsChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: candidateNames,
                datasets: [{
                    label: 'Votes',
                    data: voteCounts,
                    backgroundColor: chartColors,
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Voting Results'
                    }
                }
            }
        });
    } else if (chartId === 'admin-results-chart') {
        if (adminResultsChart) { adminResultsChart.destroy(); }
        adminResultsChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: candidateNames,
                datasets: [{
                    label: 'Votes',
                    data: voteCounts,
                    backgroundColor: chartColors,
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Voting Results'
                    }
                }
            }
        });
    }

    tableBody.innerHTML = '';
    candidates.forEach(candidate => {
        const percentage = totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(2) : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="py-3 px-6">${candidate.name}</td>
            <td class="py-3 px-6">${candidate.votes}</td>
            <td class="py-3 px-6">${percentage}%</td>
        `;
        tableBody.appendChild(row);
    });
}

// Admin Dashboard Functions
function renderAdminCandidates() {
    adminCandidatesTableBody.innerHTML = '';
    candidates.forEach(candidate => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="py-3 px-6">${candidate.name}</td>
            <td class="py-3 px-6">
                <button class="delete-candidate-btn py-1 px-3 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors" data-id="${candidate.id}">
                    <i class="fas fa-trash-alt mr-1"></i>Delete
                </button>
            </td>
        `;
        adminCandidatesTableBody.appendChild(row);
    });

    document.querySelectorAll('.delete-candidate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const candidateId = e.currentTarget.dataset.id;
            candidates = candidates.filter(c => c.id !== candidateId);
            saveToLocalStorage();
            renderAdminCandidates();
            renderResults('admin-results-chart', 'admin-results-table');
        });
    });
}

function updateVotingStatus() {
    if (votingOpen) {
        votingStatusText.textContent = 'Voting is Open';
        votingStatusText.className = 'font-bold text-lg text-green-600';
        toggleVotingBtn.textContent = 'Close Voting';
        toggleVotingBtn.className = 'py-2 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600';
    } else {
        votingStatusText.textContent = 'Voting is Closed';
        votingStatusText.className = 'font-bold text-lg text-red-600';
        toggleVotingBtn.textContent = 'Open Voting';
        toggleVotingBtn.className = 'py-2 px-4 rounded-lg bg-green-500 text-white hover:bg-green-600';
    }
}

function renderVoters() {
    votersTableBody.innerHTML = '';
    const allVoters = Object.values(voters);
    const votedCount = allVoters.filter(v => v.hasVoted).length;

    document.getElementById('total-voters').textContent = allVoters.length;
    document.getElementById('voted-count').textContent = votedCount;

    allVoters.forEach(voter => {
        const row = document.createElement('tr');
        const statusColor = voter.hasVoted ? 'bg-green-500' : 'bg-red-500';
        const statusText = voter.hasVoted ? 'Yes' : 'No';
        row.innerHTML = `
            <td class="py-3 px-6">${voter.studentId}</td>
            <td class="py-3 px-6">
                <div class="flex items-center">
                    <span class="voter-status-dot ${statusColor}"></span>${statusText}
                </div>
            </td>
        `;
        votersTableBody.appendChild(row);
    });
}

// Event Listeners
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    errorMsg.classList.add('hidden');
    const studentId = document.getElementById('student-id').value;
    const password = document.getElementById('password').value;

    if (studentId === ADMIN_ID || password === ADMIN_PASSWORD) {
        errorMsg.textContent = 'Invalid credentials. Please use the "Login as Admin" button.';
        errorMsg.classList.remove('hidden');
        return;
    }

    // Find the voter by ID
    const voter = voters[studentId];

    // If the voter exists, check if the password matches
    if (voter && voter.password !== password) {
        errorMsg.textContent = 'Invalid credentials.';
        errorMsg.classList.remove('hidden');
        return;

    }

    if (voters[studentId] && voters[studentId].hasVoted) {
        showMessageBox("Login Failed", "This student ID has already voted.");
        return;
    }

    // Create a new voter if they don't exist
    if (!voters[studentId]) {
        voters[studentId] = {
            studentId: studentId,
            password: password,
            hasVoted: false
        };
        saveToLocalStorage();
    }

    currentUser = studentId;
    userRole = 'student';
    showDashboard('student');
});

adminLoginBtn.addEventListener('click', () => {
    const studentId = document.getElementById('student-id').value;
    const password = document.getElementById('password').value;
    if (studentId === ADMIN_ID && password === ADMIN_PASSWORD) {
        currentUser = ADMIN_ID;
        userRole = 'admin';
        showDashboard('admin');
    } else {
        errorMsg.textContent = 'Invalid admin credentials.';
        errorMsg.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', showLogin);
adminLogoutBtn.addEventListener('click', showLogin);

document.querySelectorAll('a.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.dataset.page;

        // Special handling for results/vote pages to re-render
        if (pageId === 'vote-page') {
            renderVotePage();
        } else if (pageId === 'results-page') {
            renderResults('results-chart', 'results-table');
        } else if (pageId === 'admin-results') {
            renderResults('admin-results-chart', 'admin-results-table');
        } else if (pageId === 'admin-voters') {
            renderVoters();
        }

        const type = userRole;
        showPage(pageId, type);
    });
});

menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('open');
});

adminMenuToggle.addEventListener('click', () => {
    adminMainNav.classList.toggle('open');
});

// Vote Submission
submitVoteBtn.addEventListener('click', () => {
    const selectedCandidateId = document.querySelector('input[name="candidate"]:checked')?.value;

    if (!selectedCandidateId) {
        showMessageBox("Vote Submission Failed", "Please select a candidate to vote.");
        return;
    }

    if (voters[currentUser].hasVoted) {
        showMessageBox("Vote Submission Failed", "You have already cast your vote.");
        return;
    }

    // Find the selected candidate and increment their vote count
    const candidate = candidates.find(c => c.id === selectedCandidateId);
    if (candidate) {
        candidate.votes++;
    }

    // Mark voter as having voted
    voters[currentUser].hasVoted = true;
    saveToLocalStorage();

    showMessageBox("Vote Submitted", "Your vote has been cast successfully!");
    renderVotePage(); // Re-render to show "already voted" message
});

// Admin Actions
addCandidateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newCandidateName = document.getElementById('new-candidate-name').value;
    const newCandidateId = Date.now().toString();
    candidates.push({ id: newCandidateId, name: newCandidateName, votes: 0 });
    document.getElementById('new-candidate-name').value = '';
    saveToLocalStorage();
    renderAdminCandidates();
    showMessageBox("Success", `${newCandidateName} has been added as a candidate.`);
});

toggleVotingBtn.addEventListener('click', () => {
    votingOpen = !votingOpen;
    saveToLocalStorage();
    updateVotingStatus();
    showMessageBox("Voting Status", `Voting is now ${votingOpen ? 'OPEN' : 'CLOSED'}.`);
});

// Student Password Change
changePasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (newPassword !== confirmPassword) {
        showMessageBox("Password Change Failed", "Passwords do not match.");
        return;
    }
    voters[currentUser].password = newPassword;
    saveToLocalStorage();
    showMessageBox("Success", "Your password has been changed.");
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
});

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    if (Object.keys(voters).length === 0) {
        // Initialize a few sample voters if none exist
        voters['S101'] = { studentId: 'S101', password: 'S101', hasVoted: false };
        voters['S102'] = { studentId: 'S102', password: 'S102', hasVoted: false };
        voters['S103'] = { studentId: 'S103', password: 'S103', hasVoted: false };
        saveToLocalStorage();
    }
    if (candidates.length === 0) {
        // Initialize a few sample candidates
        candidates.push({ id: 'c1', name: 'Candidate A', votes: 0 });
        candidates.push({ id: 'c2', name: 'Candidate B', votes: 0 });
        candidates.push({ id: 'c3', name: 'Candidate C', votes: 0 });
        saveToLocalStorage();
    }
    showLogin();
});