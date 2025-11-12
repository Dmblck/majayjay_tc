const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER
router.post("/register", async (req, res) => {
  const db = req.app.get("db");
  const { username, email, password, confirm_password } = req.body;

  if (!username || !email || !password || !confirm_password)
    return res.status(400).json({ success: false, message: "All fields are required" });

  if (password !== confirm_password)
    return res.status(400).json({ success: false, message: "Passwords do not match" });

  try {
    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existingUser.length > 0)
      return res.status(409).json({ success: false, message: "Username or email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'user')",
      [username, email, hashedPassword]
    );

    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const db = req.app.get("db");
  const JWT_SECRET = req.app.get("jwt_secret");
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password are required" });

  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0)
      return res.status(400).json({ success: false, message: "Invalid email or password" });

    const user = users[0];

    // Compare with password_hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 🚀 Include redirect path based on role
    const redirectPath = user.role === "admin" ? "/admin" : "/home";

    res.json({
      success: true,
      message: "Login successful",
      token,
      redirect: redirectPath,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;