const admins = {
  "faithadmin": { password: "1234", name: "Faith" },
  "damian": { password: "abcd", name: "Damian" }
};

let githubToken = "";
let loggedInAdmin = "";

function login() {
  const user = document.getElementById("username").value.trim().toLowerCase();
  const pass = document.getElementById("password").value.trim();
  const error = document.getElementById("loginError");

  if (admins[user] && admins[user].password === pass) {
    loggedInAdmin = admins[user].name;
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("tokenSection").classList.remove("hidden");
    error.textContent = "";
  } else {
    error.textContent = "Invalid username or password.";
  }
}

function submitToken() {
  githubToken = document.getElementById("githubToken").value.trim();
  if (githubToken.length > 5) {
    document.getElementById("tokenSection").classList.add("hidden");
    document.getElementById("panelSection").classList.remove("hidden");
    document.getElementById("welcomeText").textContent = `Welcome ${loggedInAdmin}`;
  } else {
    alert("Invalid GitHub Token");
  }
}

function validatePhone(input) {
  if (input.value.length > 11) input.value = input.value.slice(0, 11);
}

async function addSingle() {
  let phone = document.getElementById("phoneNumber").value.trim();
  let name = document.getElementById("fullName").value.trim();
  let reservation = document.getElementById("reservationCode").value.trim();
  let adminNumber = document.getElementById("adminNumber").value.trim();
  let error = document.getElementById("singleError");

  if (phone.length !== 11) {
    error.textContent = "Phone must be 11 digits.";
    return;
  }

  let data = await fetchList();
  if (data[phone]) {
    error.innerHTML = `This number already exists with Reservation Code "${data[phone].reservation}". Can't override. <span class="policy-link" onclick="alert('Reservation Policy: No duplicate reservations allowed.')">Reservation Policy</span>`;
    return;
  }

  data[phone] = { name, reservation, adminNumber };
  await saveList(data);
  error.textContent = "✅ Entry added successfully!";
}

async function addBatch() {
  let batchText = document.getElementById("batchData").value.trim();
  let reservation = document.getElementById("batchReservation").value.trim();
  let adminNumber = document.getElementById("batchAdminNumber").value.trim();
  let error = document.getElementById("batchError");

  if (!batchText || !reservation || !adminNumber) {
    error.textContent = "All fields are required for batch entry.";
    return;
  }

  let lines = batchText.split("\n").map(line => line.trim()).filter(Boolean);
  let data = await fetchList();
  let added = 0;

  for (let line of lines) {
    let [phone, ...nameParts] = line.split(",");
    let name = nameParts.join(",").trim();
    phone = phone.trim();

    if (phone.length !== 11) continue;
    if (data[phone]) continue;

    data[phone] = { name, reservation, adminNumber };
    added++;
  }

  await saveList(data);
  error.textContent = `✅ Added ${added} records successfully!`;
}

async function fetchList() {
  const res = await fetch("list.json?" + Date.now());
  return await res.json();
}

async function saveList(data) {
  let content = JSON.stringify(data, null, 2);
  let repo = "SheDiamondApprovedInvitationList";
  let path = "list.json";

  await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      "Authorization": `token ${githubToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Update list.json",
      content: btoa(unescape(encodeURIComponent(content))),
      sha: await getFileSHA(repo, path)
    })
  });
}

async function getFileSHA(repo, path) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { "Authorization": `token ${githubToken}` }
  });
  const json = await res.json();
  return json.sha;
}
