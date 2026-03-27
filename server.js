import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Groq from "groq-sdk";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "quicktoolsstudent@gmail.com",
    pass: "eadj pcot gqgr ppcs"
  }
});
dotenv.config();

const app = express();

// =========================
// ✅ MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// ✅ DB CONNECT (SECURE)
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ DB ERROR:", err));

// =========================
// ✅ USER MODEL
// =========================
const User = mongoose.model("User", {
  username: String,
  password: String
});

// =========================
// 📩 CONTACT MODEL
// =========================
const Contact = mongoose.model("Contact", {
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

// =========================
// 🤖 GROQ SETUP
// =========================
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =========================
// 🤖 ATS CHECK API
// =========================
app.post("/ats-check", async (req, res) => {
  try {
    const { resumeText, jobDesc } = req.body;

    if (!resumeText) {
      return res.json({ result: "⚠ Resume text missing" });
    }

    const prompt = `
You are an ATS Resume Analyzer.

IMPORTANT:
Return output EXACTLY in this format:

ATS Score: XX/100

Then below give:
- Missing Keywords
- Improvements

Resume:
${resumeText}

Job Description:
${jobDesc}
`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
    });

    const result = completion.choices[0].message.content;

    res.json({ result });

  } catch (error) {
    console.error(error);
    res.json({ result: "⚠ AI failed. Check API key or server." });
  }
});

// =========================
// 🔐 SIGNUP API
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

    const newUser = new User({ username, password });
    await newUser.save();

    res.json({ success: true, message: "User created" });

  } catch (err) {
    console.log(err); // 🔥 VERY IMPORTANT
    res.json({ success: false, message: "Signup failed" });
  }
});

// =========================
// 🔐 LOGIN API (JWT)
// =========================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ success: false });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.json({ success: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false });
    }

    const token = jwt.sign(
      { username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ success: true, token });

  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }
});

// =========================
// 📩 CONTACT API
// =========================
app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    await transporter.sendMail({
      from: "quicktoolsstudent@gmail.com",
      to: "quicktoolsstudent@gmail.com",
      subject: "New Contact Message",
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    });

    console.log("✅ EMAIL SENT SUCCESS");

    res.json({ success: true });

  } catch (err) {
    console.log("❌ EMAIL ERROR:", err);
    res.json({ success: false });
  }
});

// =========================
// 📊 STATS API
// =========================
app.get("/stats", async (req, res) => {
  try {
    const totalMessages = await Contact.countDocuments();
    const totalUsers = await User.countDocuments();

    res.json({
      messages: totalMessages,
      users: totalUsers
    });

  } catch (err) {
    console.log(err);
    res.json({ messages: 0, users: 0 });
  }
});

// =========================
// 🗑 DELETE MESSAGE
// =========================
app.delete("/contact/:id", async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

// =========================
// 📊 GET ALL CONTACT MESSAGES
// =========================
app.get("/contacts", async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.log(err);
    res.json([]);
  }
});

// =========================
// 🚀 START SERVER
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});