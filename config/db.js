const mongoose = require("mongoose");

// Connects with retries. Never prints the connection string (it contains credentials).
// Resolves true when connected, false if every attempt failed (the demo keeps working).
async function connectDB(attempts = 5) {
  const mongoURI = process.env.MONGO_URI || (process.env.NODE_ENV === "production" ? "" : "mongodb://127.0.0.1:27017/rxchain");

  if (!mongoURI) {
    console.error("[db] MONGO_URI is not set. The real API is disabled; the public demo still works.");
    return false;
  }

  for (let i = 1; i <= attempts; i++) {
    try {
      await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
      console.log("[db] MongoDB connected ->", mongoose.connection.name);
      return true;
    } catch (error) {
      console.error(`[db] MongoDB connection failed (attempt ${i}/${attempts}):`, error.message);
      if (i < attempts) await new Promise((r) => setTimeout(r, 5000));
    }
  }
  console.error("[db] Giving up. Check MONGO_URI and the Atlas Network Access list. The public demo still works.");
  return false;
}

module.exports = connectDB;
