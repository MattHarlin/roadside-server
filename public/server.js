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

const PORT = process.env.PORT || 3000;

// ---------------- MIDDLEWARE ----------------
app.use(express.json());

app.use(cors({
  origin: "https://roadside-server.onrender.com",
  credentials: true
}));

app.use(session({
  secret: "my-secret-key",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: true,
    sameSite: "none"
  }
}));

// ---------------- MONGODB ----------------
mongoose
  .connect("mongodb+srv://mattharlin56_db_user:roadside-server@admin.u4zdgvy.mongodb.net/roadside?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ---------------- MODEL ----------------
const Request = mongoose.model("Request", {
  name: String,
  issue: String,
  time: Date
});

// ---------------- AUTH MIDDLEWARE ----------------
function requireAuth(req, res, next) {
  if (!req.session.auth) {
    return res.redirect("/login");
  }
  next();
}

function requireAuthApi(req, res, next) {
  if (!req.session.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ---------------- PUBLIC ROUTES ----------------
app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/testdb", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.send("MongoDB works");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ---------------- API ROUTES ----------------
app.get("/api/requests", requireAuthApi, async (req, res) => {
  const data = await Request.find().sort({ time: -1 });
  res.json(data);
});

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

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
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
            credentials: "include",
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
app.get("/data", requireAuth, async (req, res) => {
  res.send(`
    <html>
    <body style="font-family: Arial;">
      <h1>Service Requests</h1>
      <a href="/logout">Logout</a>

      <div id="container"></div>

      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const container = document.getElementById("container");

        function addCard(r) {
          const div = document.createElement("div");
          div.style.border = "1px solid #ccc";
          div.style.margin = "10px";
          div.style.padding = "10px";

          div.innerHTML =
            "<p><b>Name:</b> " + r.name + "</p>" +
            "<p><b>Issue:</b> " + r.issue + "</p>" +
            "<p><b>Time:</b> " + new Date(r.time).toLocaleString() + "</p>";

          container.prepend(div);
        }

        socket.on("new-request", addCard);

        fetch("/api/requests", { credentials: "include" })
          .then(res => res.json())
          .then(data => data.forEach(addCard));
      </script>
    </body>
    </html>
  `);
});

// ---------------- START SERVER ----------------
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
