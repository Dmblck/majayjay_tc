// server.js (PostgreSQL-ready)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const multer = require("multer");
const cloudinary = require("./config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const pool = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

pool.query("SELECT NOW()")
  .then((res) => console.log("PostgreSQL connected:", res.rows[0]))
  .catch((err) => console.error("DB connection error:", err));

app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Access denied. No token provided." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "majayjay_uploads",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
  },
});

const upload = multer({ storage });

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Access denied. No token provided." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "Admins only" });
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

// ----------------- Routes -----------------

// Register
app.post("/api/users/register", async (req, res) => {
  const {
    username,
    email,
    password,
    confirm_password,
    first_name,
    middle_name,
    last_name,
    age,
    address,
  } = req.body;

  if (
    !username ||
    !email ||
    !password ||
    !confirm_password ||
    !first_name ||
    !last_name
  )
    return res
      .status(400)
      .json({ success: false, message: "Required fields missing" });

  if (password !== confirm_password)
    return res
      .status(400)
      .json({ success: false, message: "Passwords do not match" });

  if (age && (isNaN(age) || age <= 0))
    return res
      .status(400)
      .json({ success: false, message: "Please enter a valid age" });

  try {
    const { rows: existingUser } = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existingUser.length > 0)
      return res
        .status(409)
        .json({ success: false, message: "Username or email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = `INSERT INTO users (username, email, password_hash, first_name, middle_name, last_name, age, address, role, preferences)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'user',$9::jsonb) RETURNING id`;
    await pool.query(insertQuery, [
      username,
      email,
      hashedPassword,
      first_name,
      middle_name || null,
      last_name,
      age || null,
      address || null,
      JSON.stringify([]),
    ]);

    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Login
app.post("/api/users/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      message: "Username/Email and password are required",
    });
  }

  try {
    const { rows: users } = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2 LIMIT 1",
      [identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const user = users[0];

    if (user.banned) {
      return res.status(403).json({
        success: false,
        message: "Your account has been banned. Please contact the administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    let parsedPreferences = [];
    try {
      // preferences might already be JSON if using JSONB
      parsedPreferences = typeof user.preferences === "string"
        ? JSON.parse(user.preferences)
        : user.preferences || [];
    } catch {}

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        age: user.age,
        address: user.address,
        preferences: parsedPreferences,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get all users (admin)
app.get("/api/users", authenticateAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, first_name, middle_name, last_name, age, address, role, preferences, banned FROM users`
    );
    const users = rows.map((u) => ({
      ...u,
      preferences:
        typeof u.preferences === "string"
          ? JSON.parse(u.preferences)
          : u.preferences || [],
    }));
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Update user (owner)
app.put("/api/users/:id", authenticateToken, async (req, res) => {
  const userId = Number(req.params.id);

  if (userId !== req.user.id) {
    return res.status(403).json({ message: "You cannot edit another user's account." });
  }

  const {
    username,
    email,
    first_name,
    middle_name,
    last_name,
    age,
    address,
    password,
    confirm_password,
  } = req.body;

  try {
    if (!username || !email || !first_name || !last_name) {
      return res.status(400).json({ message: "Required fields missing." });
    }

    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3",
      [username, email, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Username or email already taken." });
    }

    let hashedPassword = null;
    if (password || confirm_password) {
      if (password !== confirm_password) {
        return res.status(400).json({ message: "Passwords do not match." });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Build dynamic update
    const fields = {
      username,
      email,
      first_name,
      middle_name,
      last_name,
      age,
      address,
    };

    if (hashedPassword) {
      fields.password_hash = hashedPassword;
    }

    const keys = Object.keys(fields);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => fields[k]);
    values.push(userId); // last param for WHERE

    await pool.query(`UPDATE users SET ${setClauses} WHERE id = $${values.length}`, values);

    res.json({ success: true, message: "Account updated successfully." });
  } catch (err) {
    console.error("Error updating account:", err);
    res.status(500).json({ message: "Server error while updating account." });
  }
});

// GET POIs
app.get("/api/pois", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM pois");
    res.json(rows);
  } catch (err) {
    console.error("Get pois error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Create POI (admin)
app.post("/api/pois", authenticateAdmin, async (req, res) => {
  const { name, description, tags, lat, lng, image, visitors } = req.body;
  try {
    const insertQuery = `INSERT INTO pois (name, description, tags, lat, lng, image, visitors)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    const { rows } = await pool.query(insertQuery, [
      name,
      description,
      tags,
      lat,
      lng,
      image,
      visitors,
    ]);
    res.json(rows[0]);
  } catch (err) {
    console.error("Create POI error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Create itinerary (user)
app.post("/api/itineraries", authenticateToken, async (req, res) => {
  const { name, route_data } = req.body;
  if (!route_data || !Array.isArray(route_data)) {
    return res.status(400).json({ message: "Invalid route data format" });
  }
  try {
    const insertQuery = `INSERT INTO itineraries (user_id, name, route_data, status)
      VALUES ($1,$2,$3::jsonb,'pending') RETURNING *`;
    const { rows } = await pool.query(insertQuery, [
      req.user.id,
      name || "My Route",
      JSON.stringify(route_data),
    ]);

    const itinerary = rows[0];
    res.status(201).json({
      success: true,
      message: "Itinerary saved successfully",
      id: itinerary.id,
      itinerary: {
        ...itinerary,
        route_data: itinerary.route_data,
      },
    });
  } catch (err) {
    console.error("Error saving itinerary:", err);
    res.status(500).json({ message: "Server error while saving itinerary" });
  }
});

// Get itineraries for user
app.get("/api/itineraries", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM itineraries WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    const itineraries = rows.map((row) => ({
      ...row,
      route_data: row.route_data,
    }));
    res.json({ success: true, itineraries });
  } catch (err) {
    console.error("Get itineraries error:", err);
    res.status(500).json({ message: "Server error while fetching itineraries" });
  }
});

// Get itinerary by id
app.get("/api/itineraries/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "SELECT * FROM itineraries WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Itinerary not found" });
    }

    const itinerary = rows[0];
    res.json({
      id: itinerary.id,
      name: itinerary.name,
      status: itinerary.status,
      created_at: itinerary.created_at,
      route_data: itinerary.route_data,
    });
  } catch (error) {
    console.error("Error fetching itinerary details:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update itinerary status
app.put("/api/itineraries/:id/status", authenticateToken, async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "finished", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  try {
    const { rowCount } = await pool.query(
      "UPDATE itineraries SET status = $1 WHERE id = $2 AND user_id = $3",
      [status, req.params.id, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    console.error("Update itinerary status error:", err);
    res.status(500).json({ message: "Server error while updating itinerary status" });
  }
});

// Get user by id
app.get("/api/users/:id", authenticateToken, async (req, res) => {
  const userId = Number(req.params.id);
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      age: user.age,
      address: user.address,
      preferences: typeof user.preferences === "string" ? JSON.parse(user.preferences) : user.preferences || [],
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Recommended POIs (exclude disliked)
app.get("/api/pois/recommended", authenticateToken, async (req, res) => {
  try {
    const { rows: allPois } = await pool.query("SELECT * FROM pois");
    const { rows: feedback } = await pool.query(
      "SELECT poi_id FROM user_feedback WHERE user_id = $1 AND liked = false",
      [req.user.id]
    );

    const dislikedIds = feedback.map((f) => f.poi_id);
    const homepagePois = allPois.filter((poi) => !dislikedIds.includes(poi.id));

    res.json({ success: true, pois: homepagePois });
  } catch (err) {
    console.error("Recommended pois error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Most-liked POIs
app.get("/api/pois/most-liked", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.lat,
        p.lng,
        p.description,
        p.image,
        p.visitors,
        COUNT(f.liked) AS total_likes
      FROM pois p
      LEFT JOIN user_feedback f 
        ON p.id = f.poi_id AND f.liked = true
      GROUP BY p.id
      ORDER BY total_likes DESC;
    `);

    res.json({ success: true, mostLiked: rows });
  } catch (err) {
    console.error("Error fetching most liked POIs:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Ban/unban user (admin)
app.post("/api/users/:id/ban", authenticateAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const { ban } = req.body;

  if (typeof ban !== "boolean") {
    return res.status(400).json({ message: "Invalid ban value" });
  }

  try {
    const { rowCount } = await pool.query(
      "UPDATE users SET banned = $1 WHERE id = $2 AND role != 'admin'",
      [ban ? true : false, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "User not found or cannot ban admin" });
    }

    res.json({ success: true, message: `User ${ban ? "banned" : "unbanned"} successfully` });
  } catch (err) {
    console.error("Update ban status error:", err);
    res.status(500).json({ message: "Server error while updating ban status" });
  }
});

// Recommended liked POIs
app.get("/api/pois/recommended/liked", authenticateToken, async (req, res) => {
  try {
    const { rows: allPois } = await pool.query("SELECT * FROM pois");
    const { rows: liked } = await pool.query(
      "SELECT poi_id FROM user_feedback WHERE user_id = $1 AND liked = true",
      [req.user.id]
    );

    const likedIds = liked.map((f) => f.poi_id);
    const recommendedPois = allPois.filter((poi) => likedIds.includes(poi.id));

    res.json({ success: true, pois: recommendedPois });
  } catch (err) {
    console.error("Recommended liked pois error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// User feedback (like/dislike)
app.post("/api/user_feedback", authenticateToken, async (req, res) => {
  let { poi_id, liked } = req.body;

  poi_id = Number(poi_id);
  liked = Number(liked);

  if (isNaN(poi_id) || ![0, 1].includes(liked)) {
    return res.status(400).json({ success: false, message: "Invalid parameters" });
  }

  try {
    const { rows: existing } = await pool.query(
      "SELECT * FROM user_feedback WHERE user_id = $1 AND poi_id = $2",
      [req.user.id, poi_id]
    );

    if (existing.length > 0) {
      await pool.query(
        "UPDATE user_feedback SET liked = $1 WHERE user_id = $2 AND poi_id = $3",
        [liked === 1, req.user.id, poi_id]
      );
    } else {
      await pool.query(
        "INSERT INTO user_feedback (user_id, poi_id, liked) VALUES ($1, $2, $3)",
        [req.user.id, poi_id, liked === 1]
      );
    }

    res.json({ success: true, message: "Feedback saved successfully" });
  } catch (err) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete POI (admin)
app.delete("/api/pois/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM pois WHERE id = $1", [id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: "POI not found" });
    }
    res.json({ success: true, message: "POI deleted successfully" });
  } catch (err) {
    console.error("Error deleting POI:", err);
    res.status(500).json({ message: "Server error while deleting POI" });
  }
});

// Update POI (admin)
app.put("/api/pois/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, tags, lat, lng, image, visitors } = req.body;

  try {
    const { rowCount } = await pool.query(
      `UPDATE pois SET name=$1, description=$2, tags=$3, lat=$4, lng=$5, image=$6, visitors=$7 WHERE id=$8`,
      [name, description, tags, lat, lng, image, visitors, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "POI not found" });
    }

    const { rows: updatedPoi } = await pool.query("SELECT * FROM pois WHERE id = $1", [id]);
    res.json(updatedPoi[0]);
  } catch (err) {
    console.error("Error updating POI:", err);
    res.status(500).json({ message: err.message });
  }
});

// Upload image (admin) - Cloudinary via multer-storage-cloudinary
app.post("/api/upload-image", authenticateAdmin, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }
  res.json({
    success: true,
    filename: req.file.originalname,
    url: req.file.path,
  });
});

// Reports (admin)
app.get("/api/reports", authenticateAdmin, async (req, res) => {
  const type = req.query.type;
  try {
    if (type === "users") {
      let query = "SELECT id, username, email, role FROM users WHERE 1=1";
      const params = [];
      let idx = 1;
      if (req.query.id) {
        query += ` AND id = $${idx++}`;
        params.push(req.query.id);
      }
      if (req.query.username) {
        query += ` AND username LIKE $${idx++}`;
        params.push(`%${req.query.username}%`);
      }
      if (req.query.email) {
        query += ` AND email LIKE $${idx++}`;
        params.push(`%${req.query.email}%`);
      }
      if (req.query.role) {
        query += ` AND role = $${idx++}`;
        params.push(req.query.role);
      }
      const { rows: users } = await pool.query(query, params);
      const totalUsers = users.filter((u) => u.role !== "admin").length;
      res.json({ totalUsers, users });
    } else if (type === "pois") {
      let query =
        "SELECT id, name, description, tags, lat, lng, image, visitors FROM pois WHERE 1=1";
      const params = [];
      let idx = 1;
      if (req.query.id) {
        query += ` AND id = $${idx++}`;
        params.push(req.query.id);
      }
      if (req.query.name) {
        query += ` AND name LIKE $${idx++}`;
        params.push(`%${req.query.name}%`);
      }
      if (req.query.visitors) {
        query += ` AND visitors >= $${idx++}`;
        params.push(req.query.visitors);
      }
      const { rows: pois } = await pool.query(query, params);
      res.json({ totalPOIs: pois.length, pois });
    } else {
      res.status(400).json({ message: "Invalid report type" });
    }
  } catch (err) {
    console.error("Reports error:", err);
    res.status(500).json({ message: err.message });
  }
});

// static files
app.use(express.static(path.join(__dirname, "build")));
app.use("/images", express.static(path.join(__dirname, "public/images")));

app.get("/", (req, res) => res.redirect("/login"));
app.get("/*", (req, res) =>
  res.sendFile(path.join(__dirname, "build", "index.html"))
);

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
