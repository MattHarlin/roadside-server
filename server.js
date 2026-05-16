const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: "my-secret-key",
    resave: false,
    saveUninitialized: true
  })
);

// ---------------- MONGODB ----------------
mongoose
  .connect(
    "mongodb+srv://mattharlin56_db_user:roadside-server@admin.u4zdgvy.mongodb.net/roadside?retryWrites=true&w=majority"
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));
// ---------------- MODEL ----------------
const Request = mongoose.model("Request", {
  name: String,
  issue: String,
  time: Date
});

// ---------------- HOME ----------------
app.get("/testdb", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.send("MongoDB works");
  } catch (err) {
    console.log(err);
    res.status(500).send(err.message);
  }
});

app.get("/", (req, res) => {
  res.send("Server running");
});
// ---------------- API GET ----------------
app.get("/api/requests", async (req, res) => {
  const data = await Request.find().sort({ time: -1 });
  res.json(data);
});

// ---------------- CREATE REQUEST ----------------
app.post("/request", async (req, res) => {
  const job = new Request({
    name: req.body.name,
    issue: req.body.issue,
    time: new Date()
  });

  await job.save();

  io.emit("new-request", job);

  res.json({ status: "saved" });
});

// ---------------- LOGIN ----------------
app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === "1113") {
    req.session.auth = true;
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

// ---------------- LOGIN PAGE ----------------
app.get("/login", (req, res) => {
  res.send(`
    <html>
    <body style="font-family: Arial; padding: 40px;">
      <h2>Admin Login</h2>

      <input id="password" type="password" placeholder="Password" />
      <button onclick="login()">Login</button>

      <p id="msg"></p>

      <script>
        async function login() {
          const password = document.getElementById("password").value;

          const res = await fetch("/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
          });

          if (res.ok) {
            window.location.href = "/data";
          } else {
            document.getElementById("msg").innerText = "Wrong password";
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ---------------- DASHBOARD ----------------
app.get("/data", async (req, res) => {
  if (!req.session.auth) {
    return res.send("<h2>Access denied. Please log in.</h2>");
  }

  res.send(`
    <html>
    <head>
      <title>Dashboard</title>
      <style>
        body { font-family: Arial; background: #f4f4f4; padding: 20px; }
        .card { background: white; padding: 15px; margin: 10px; border-radius: 10px; }
      </style>
    </head>

    <body>
      <h1>Service Requests</h1>
      <div id="container"></div>

      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const container = document.getElementById("container");

        function addCard(r) {
          const div = document.createElement("div");
          div.className = "card";
          div.innerHTML =
            "<p><b>Name:</b> " + r.name + "</p>" +
            "<p><b>Issue:</b> " + r.issue + "</p>" +
            "<p><b>Time:</b> " + new Date(r.time).toLocaleString() + "</p>";

          container.prepend(div);
        }

        socket.on("new-request", (data) => {
          addCard(data);
        });

        async function load() {
          const res = await fetch("/api/requests");
          const data = await res.json();
          container.innerHTML = "";
          data.forEach(addCard);
        }

        load();
        setInterval(load, 5000);
      </script>
    </body>
    </html>
  `);
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
