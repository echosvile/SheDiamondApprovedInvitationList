// ======= Approved Admins =======
const approvedAdmins = {
  "faith": { password: "1234", name: "Faith Admin" },
  "damian": { password: "abcd", name: "Damian" },
  "ada": { password: "pass", name: "Ada" }
};

let currentAdminName = "";
let githubToken = "";

// ======= Pages =======
const loginPage = document.getElementById("loginPage");
const tokenPage = document.getElementById("tokenPage");
const adminPanel = document.getElementById("adminPanel");

// ======= Login Step =======
function loginAdmin() {
  const user = document.getElementById("username").value.trim().toLowerCase();
  const pass = document.getElementById("password").value.trim();

  if (approvedAdmins[user] && approvedAdmins[user].password === pass) {
    currentAdminName = approvedAdmins[user].name;
    loginPage.classList.add("hidden");
    tokenPage.classList.remove("hidden");
  } else {
    alert("Invalid username or password");
  }
}

// ======= Back Button from Token Page =======
function goBack() {
  tokenPage.classList.add("hidden");
  loginPage.classList.remove("hidden");
}

// ======= Token Step =======
async function verifyToken() {
  githubToken = document.getElementById("githubToken").value.trim();
  if (!githubToken) {
    alert("Enter GitHub token");
    return;
  }

  // Validate GitHub token by making a real API request
  try {
    const testRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: { Authorization: `token ${githubToken}` }
    });

    if (!testRes.ok) {
      alert("Invalid GitHub token");
      return;
    }
  } catch (err) {
    alert("Error validating GitHub token");
    return;
  }

  // Save token and time in localStorage
  localStorage.setItem("githubToken", githubToken);
  localStorage.setItem("tokenTime", Date.now().toString());

  tokenPage.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  document.getElementById("welcomeText").innerText = `Welcome, ${currentAdminName}`;

  // Start countdown timer
  const expireTime = Date.now() + (2 * 60 * 60 * 1000);
  startTokenCountdown(expireTime);
}

// ======= GitHub Repo Info =======
const repoOwner = "Echosvile";
const repoName = "SheDiamondApprovedInvitationList";
const filePath = "list.json";

// ======= Fetch Current List =======
async function fetchList() {
  const token = githubToken || localStorage.getItem("githubToken");
  const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?timestamp=${Date.now()}`, {
    headers: { Authorization: `token ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch list.json");
  const file = await res.json();
  const content = atob(file.content);
  return { data: JSON.parse(content), sha: file.sha };
}

// ======= Save Updated List =======
async function saveList(newData, sha) {
  const token = githubToken || localStorage.getItem("githubToken");
  const content = btoa(JSON.stringify(newData, null, 2));
  const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
    method: "PUT",
    headers: { Authorization: `token ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Update list.json via Admin Panel",
      content,
      sha
    })
  });
  if (res.ok) {
    alert("✅ Data updated successfully");
  } else {
    alert("❌ Failed to update data");
  }
}

// ======= Add Single Entry =======
async function addSingle() {
  const phone = document.getElementById("singlePhone").value.trim();
  const name = document.getElementById("singleName").value.trim();
  const reservation = document.getElementById("singleReservation").value.trim();
  const adminNumber = document.getElementById("singleAdminNumber").value.trim();

  if (!/^\d{11}$/.test(phone)) return alert("Enter valid 11-digit phone number");
  if (!name || !reservation || !/^\d{11}$/.test(adminNumber)) return alert("Fill all fields correctly");

  let { data, sha } = await fetchList();

  // Reservation policy check
  if (data[phone] && data[phone].reservation !== reservation) {
    return alert(`This number already exists with Reservation code "${data[phone].reservation}".\nCan't Override Reservation Code for reservation policy.`);
  }

  data[phone] = { name, reservation, adminNumber };
  await saveList(data, sha);
}

// ======= Add Batch Entries =======
async function addBatch() {
  const batchText = document.getElementById("batchInput").value.trim();
  const reservation = document.getElementById("batchReservation").value.trim();
  const adminNumber = document.getElementById("batchAdminNumber").value.trim();

  if (!batchText || !reservation || !/^\d{11}$/.test(adminNumber)) return alert("Fill all batch fields correctly");

  let { data, sha } = await fetchList();
  const lines = batchText.split("\n");

  for (let line of lines) {
    const [phone, name] = line.split(",").map(v => v.trim());
    if (!/^\d{11}$/.test(phone) || !name) continue;

    // Reservation policy check
    if (data[phone] && data[phone].reservation !== reservation) {
      alert(`Skipped ${phone} (${name}) — Already exists with Reservation code "${data[phone].reservation}"`);
      continue;
    }

    data[phone] = { name, reservation, adminNumber };
  }

  await saveList(data, sha);
}

// ======= Start Token Countdown =======
function startTokenCountdown(expireTime) {
  const timerEl = document.getElementById("timer");
  function updateTimer() {
    const now = Date.now();
    const diff = expireTime - now;
    if (diff <= 0) {
      timerEl.innerText = "Session expired";
      logoutAdmin();
      return;
    }
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (diff <= 10 * 60 * 1000) {
      timerEl.style.color = "red";
    } else {
      timerEl.style.color = "#ff6600";
    }

    timerEl.innerText = `Token expires in ${minutes}m ${seconds}s`;
    setTimeout(updateTimer, 1000);
  }
  updateTimer();
}

// ======= Logout =======
function logoutAdmin() {
  localStorage.removeItem("githubToken");
  localStorage.removeItem("tokenTime");
  location.reload();
}

// ======= Auto-Login if Token Still Valid =======
window.addEventListener("load", () => {
  const savedToken = localStorage.getItem("githubToken");
  const savedTime = localStorage.getItem("tokenTime");
  if (savedToken && savedTime) {
    const expireTime = parseInt(savedTime) + (2 * 60 * 60 * 1000);
    if (Date.now() < expireTime) {
      githubToken = savedToken;
      loginPage.classList.add("hidden");
      tokenPage.classList.add("hidden");
      adminPanel.classList.remove("hidden");
      document.getElementById("welcomeText").innerText = `Welcome, ${currentAdminName || "Admin"}`;
      startTokenCountdown(expireTime);
    } else {
      logoutAdmin();
    }
  }
});
