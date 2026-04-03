import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Groq from "groq-sdk";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

// =========================
// ✅ MIDDLEWARE
// =========================
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// =========================
// ✅ DB CONNECT
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ DB ERROR:", err));

// =========================
// ✅ MODELS
// =========================
const User = mongoose.model("User", {
  username: String,
  password: String,
  role: { type: String, default: "user" } // 🔥 NEW
});

const Contact = mongoose.model("Contact", {
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

// =========================
// 🔐 ADMIN EMAIL
// =========================
const ADMIN_EMAIL = "quicktoolsstudent@gmail.com";

// =========================
// 📩 MAIL SETUP (SECURE)
// =========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// =========================
// 🤖 GROQ SETUP
// =========================
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =========================
// 🔐 TOKEN VERIFY MIDDLEWARE
// =========================
function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(403).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// =========================
// 👑 ADMIN CHECK
// =========================
function isAdmin(req, res, next) {
  if (req.user.username !== ADMIN_EMAIL) {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

// =========================
// 🔐 SIGNUP
// =========================
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ success: false, message: "Fill all fields" });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      role: username === ADMIN_EMAIL ? "admin" : "user"
    });

    await newUser.save();

    res.json({ success: true, message: "User created" });

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Signup failed" });
  }
});

// =========================
// 🔐 LOGIN
// =========================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) return res.json({ success: false });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.json({ success: false });

    const token = jwt.sign(
      { username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ success: true, token, role: user.role });

  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }
});

// =========================
// 📩 CONTACT
// =========================
app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Contact Message",
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    });

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

// =========================
// 📊 STATS (ADMIN ONLY)
// =========================
app.get("/stats", verifyToken, isAdmin, async (req, res) => {
  const totalMessages = await Contact.countDocuments();
  const totalUsers = await User.countDocuments();

  res.json({ messages: totalMessages, users: totalUsers });
});

// =========================
// 📩 GET CONTACTS (ADMIN)
// =========================
app.get("/contacts", verifyToken, isAdmin, async (req, res) => {
  const messages = await Contact.find().sort({ createdAt: -1 });
  res.json(messages);
});

// =========================
// 🗑 DELETE MESSAGE
// =========================
app.delete("/contact/:id", verifyToken, isAdmin, async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// =========================
// 👥 GET USERS (ADMIN)
// =========================
app.get("/users", verifyToken, isAdmin, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// =========================
// 🗑 DELETE USER (SAFE)
// =========================
app.delete("/user/:id", verifyToken, isAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user.username === ADMIN_EMAIL) {
    return res.json({ success: false, message: "Cannot delete admin" });
  }

  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// =========================
// 🚀 START SERVER
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});