// ======= Approved Admins =======
const approvedAdmins = {
  "faith": { password: "1234", name: "Faith Admin" },
  "damian": { password: "abcd", name: "Damian" },
  "ada": { password: "pass", name: "Ada" }
};

let currentAdminName = "";
let githubToken = "";

// ======= GitHub Repo Info =======
const repoOwner = "Echosvile";
const repoName = "SheDiamondApprovedInvitationList";
const filePath = "list.json";

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
    alert("❌ Invalid username or password");
  }
}

// ======= Back Button from Token Page =======
function goBack() {
  tokenPage.classList.add("hidden");
  loginPage.classList.remove("hidden");
}

// ======= Token Step with Verification =======
async function verifyToken() {
  githubToken = document.getElementById("githubToken").value.trim();
  if (!githubToken) {
    alert("Enter GitHub token");
    return;
  }

  try {
    // Test request to check if token is valid for repo
    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: { Authorization: `token ${githubToken}` }
    });

    if (!res.ok) {
      alert("❌ Invalid GitHub token or no access to repository");
      return;
    }

    // Save token in session and set expiry
    sessionStorage.setItem("githubToken", githubToken);
    sessionStorage.setItem("tokenExpiry", Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    tokenPage.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    document.getElementById("welcomeText").innerText = `Welcome, ${currentAdminName}`;
  } catch (err) {
    alert("❌ Error verifying token");
  }
}

// ======= Auto Token Expiry Check =======
function checkTokenExpiry() {
  const expiry = sessionStorage.getItem("tokenExpiry");
  if (expiry && Date.now() > expiry) {
    sessionStorage.removeItem("githubToken");
    sessionStorage.removeItem("tokenExpiry");
    alert("⚠️ Your session has expired. Please log in again.");
    location.reload();
  }
}
setInterval(checkTokenExpiry, 60 * 1000); // Check every minute

// ======= Logout =======
function logoutAdmin() {
  sessionStorage.removeItem("githubToken");
  sessionStorage.removeItem("tokenExpiry");
  location.reload();
}

// ======= Fetch Current List =======
async function fetchList() {
  const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?timestamp=${Date.now()}`, {
    headers: { Authorization: `token ${githubToken}` }
  });
  const file = await res.json();
  const content = atob(file.content);
  return { data: JSON.parse(content), sha: file.sha };
}

// ======= Save Updated List =======
async function saveList(newData, sha) {
  const content = btoa(JSON.stringify(newData, null, 2));
  const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
    method: "PUT",
    headers: { Authorization: `token ${githubToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Update list.json via Admin Panel",
      content,
      sha
    })
  });

  if (res.ok) {
    alert("✅ Name(s) Added Successfully");
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
