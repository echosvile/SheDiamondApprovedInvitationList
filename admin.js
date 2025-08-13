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
    alert("❌ Invalid username or password");
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

  try {
    let { data } = await fetchList();
    if (!data) throw new Error("No access");
    tokenPage.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    document.getElementById("welcomeText").innerText = `Welcome, ${currentAdminName}`;
  } catch (err) {
    alert("❌ Invalid GitHub token or repository access denied");
  }
}

// ======= GitHub Repo Info =======
const repoOwner = "echosvile";
const repoName = "SheDiamondApprovedInvitationList";
const filePath = "list.json";

// ======= Fetch Current List =======
async function fetchList() {
  const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?timestamp=${Date.now()}`, {
    headers: { Authorization: `token ${githubToken}` }
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const file = await res.json();
  if (!file.content) throw new Error("File content missing");

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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub save error: ${res.status} - ${errText}`);
  }
}

// ======= Add Single Entry =======
async function addSingle() {
  try {
    const phone = document.getElementById("singlePhone").value.trim();
    const name = document.getElementById("singleName").value.trim();
    const reservation = document.getElementById("singleReservation").value.trim();
    const adminNumber = document.getElementById("singleAdminNumber").value.trim();

    if (!/^\d{11}$/.test(phone)) return alert("Enter valid 11-digit phone number");
    if (!name || !reservation || !/^\d{11}$/.test(adminNumber)) return alert("Fill all fields correctly");

    let { data, sha } = await fetchList();
    let changes = 0;

    if (data[phone] && data[phone].reservation !== reservation) {
      return alert(`This number already exists with Reservation code "${data[phone].reservation}".\nCan't Override Reservation Code for reservation policy.`);
    }

    data[phone] = { name, reservation, adminNumber };
    changes++;

    if (changes > 0) {
      await saveList(data, sha);
      alert("✅ Name Added Successfully");
    }
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  }
}

// ======= Add Batch Entries =======
async function addBatch() {
  try {
    const batchText = document.getElementById("batchInput").value.trim();
    const reservation = document.getElementById("batchReservation").value.trim();
    const adminNumber = document.getElementById("batchAdminNumber").value.trim();

    if (!batchText || !reservation || !/^\d{11}$/.test(adminNumber)) return alert("Fill all batch fields correctly");

    let { data, sha } = await fetchList();
    const lines = batchText.split("\n");
    let changes = 0;

    for (let line of lines) {
      const [phone, name] = line.split(",").map(v => v.trim());
      if (!/^\d{11}$/.test(phone) || !name) {
        alert(`⚠️ Skipped invalid entry: "${line}"`);
        continue;
      }

      if (data[phone] && data[phone].reservation !== reservation) {
        alert(`⚠️ Skipped ${phone} (${name}) — Already exists with Reservation code "${data[phone].reservation}"`);
        continue;
      }

      data[phone] = { name, reservation, adminNumber };
      changes++;
    }

    if (changes > 0) {
      await saveList(data, sha);
      alert("✅ Names Added Successfully");
    } else {
      alert("ℹ️ No new entries were added.");
    }
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  }
}
