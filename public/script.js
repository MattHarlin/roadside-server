async function sendRequest() {
  const name = document.getElementById("name").value;
  const issue = document.getElementById("issue").value;

  try {
    const res = await fetch("", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, issue })
    });

    const data = await res.json();
    alert("Request sent successfully!");
  } catch (err) {
    console.error(err);
    alert("Error sending request");
  }
}
