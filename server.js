require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const { seedData } = require("./scripts/seed");
const demoData = require("./utils/demoData");

const authRoutes = require("./routes/authRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const clinicalRoutes = require("./routes/clinicalRoutes");
const adherenceRoutes = require("./routes/adherenceRoutes");
const demoRoutes = require("./routes/demoRoutes");

const isProd = process.env.NODE_ENV === "production";

// JWT secret: mandatory in production, random (per-start) in local dev.
if (!process.env.JWT_SECRET) {
  if (isProd) {
    console.error("[server] JWT_SECRET is not set. Set it in the Render environment variables.");
    process.exit(1);
  }
  process.env.JWT_SECRET = require("crypto").randomBytes(32).toString("hex");
  console.warn("[server] JWT_SECRET not set - using a temporary random one (logins reset on restart).");
}

const app = express();

// Render terminates HTTPS at its proxy.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Frontend and API share one origin, so CORS is only needed for an optional
// separate front-end. Set CORS_ORIGIN (comma separated) to allow one.
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()), credentials: true }));
}

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  next();
});

app.use(express.json({ limit: "200kb" }));

app.get("/api/health", (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.json({
    status: "ok",
    message: "RxChain API is running",
    database: dbUp ? "connected" : "disconnected",
    demo: "available",
  });
});

// Public, read-only demo (fictional in-memory data, never touches MongoDB).
app.use("/api/demo", demoRoutes);

// Real API: needs MongoDB. If the database is down, answer 503 instead of hanging.
const requireDb = (req, res, next) =>
  mongoose.connection.readyState === 1
    ? next()
    : res.status(503).json({ message: "Database is not connected. Try the public demo, or check MONGO_URI." });

app.use("/api/auth", requireDb, authRoutes);
app.use("/api/prescriptions", requireDb, prescriptionRoutes);
app.use("/api/admin", requireDb, adminRoutes);
app.use("/api/users", requireDb, userRoutes);
app.use("/api/clinical", requireDb, clinicalRoutes);
app.use("/api/adherence", requireDb, adherenceRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found", path: req.originalUrl });
});

// ---- Serve the frontend from the same origin ----
// Only the public front-end folders/files are exposed, never rxchain-backend/ or .env
const FRONT = path.join(__dirname, "..");
for (const dir of ["css", "js", "assets", "pages"]) {
  app.use("/" + dir, express.static(path.join(FRONT, dir), { maxAge: isProd ? "1h" : 0 }));
}
app.get(["/", "/index.html"], (req, res) => res.sendFile(path.join(FRONT, "index.html")));
app.get("/login.html", (req, res) => res.sendFile(path.join(FRONT, "login.html")));
app.get("/login", (req, res) => res.redirect("/login.html"));
app.get("/demo", (req, res) => res.redirect("/index.html#demo"));

// Unknown page -> homepage (keeps refresh / deep links from showing a bare error)
app.use((req, res) => {
  if (req.method === "GET" && req.accepts("html")) return res.status(404).sendFile(path.join(FRONT, "index.html"));
  res.status(404).send("Not found");
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[server] Unhandled error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  await demoData.build();
  console.log("[demo] public demo dataset ready (in-memory, read-only)");

  // Listen first so Render sees the port immediately; connect to MongoDB alongside.
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] RxChain running on port ${PORT}`);
  });

  const ok = await connectDB();
  if (ok) await seedData();
}

startServer().catch((error) => {
  console.error("[server] Startup failed:", error);
  process.exit(1);
});
