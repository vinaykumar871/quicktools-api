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
  password: String
});

const Contact = mongoose.model("Contact", {
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

// =========================
// 📩 MAIL SETUP
// =========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "quicktoolsstudent@gmail.com",
    pass: "eadj pcot gqgr ppcs"
  }
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
ATS Score format:

ATS Score: XX/100

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

    res.json({ result: completion.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.json({ result: "⚠ AI failed" });
  }
});

// =========================
// 🤖 AI CHAT API (NEW 🔥)
// =========================
app.post("/ai-chat", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.json({ reply: "Please enter a message" });
    }

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (err) {
    console.log(err);
    res.json({ reply: "AI failed" });
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword
    });

    await newUser.save();

    res.json({ success: true, message: "User created" });

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Signup failed" });
  }
});

// =========================
// 🔐 LOGIN API
// =========================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) return res.json({ success: false });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.json({ success: false });

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

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

// =========================
// 📊 USERS & ADMIN
// =========================
app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.delete("/user/:id", async (req, res) => {
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