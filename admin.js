async function addGuestToList(name, number) {
  const token = githubToken;
  const repo = "SheDiamond-Approved-Attendance-List";
  const username = "echosvile";
  const file = "list.json";
  const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/${file}`;

  try {
    const getRes = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}` }
    });

    if (!getRes.ok) {
      const errorText = await getRes.text();
      throw new Error("GitHub Fetch Error: " + errorText);
    }

    const getData = await getRes.json();
    const content = JSON.parse(atob(getData.content));
    const sha = getData.sha;

    // 🔄 Check for duplicate entry
    if (content[number]) {
      const confirmReplace = confirm(`⚠️ Number ${number} already exists for "${content[number]}". Do you want to replace it with "${name}"?`);
      if (!confirmReplace) {
        document.getElementById("status").innerHTML = "<span class='error'>❌ Action cancelled by user.</span>";
        return;
      }
    }

    const updatedList = { [number]: name, ...content };
    const encoded = btoa(JSON.stringify(updatedList, null, 2));

    const commitRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Added ${name} to list.json`,
        content: encoded,
        sha
      })
    });

    if (commitRes.ok) {
      document.getElementById("status").innerHTML = `<span class='success'>✅ ${name} (${number}) added successfully.</span>`;
      document.getElementById("number").value = "";
      document.getElementById("name").value = "";
    } else {
      const errorText = await commitRes.text();
      document.getElementById("status").innerHTML = "<span class='error'>❌ Failed to commit to GitHub.</span>";
      console.error("Commit error:", errorText);
    }
  } catch (err) {
    document.getElementById("status").innerHTML = "<span class='error'>❌ Error occurred. Check console.</span>";
    console.error(err);
  }
}

function handleSubmit() {
  const name = document.getElementById("name").value.trim();
  const number = document.getElementById("number").value.trim();
  if (!name || !number) {
    alert("Please enter both name and number.");
    return;
  }
  addGuestToList(name, number);
}
