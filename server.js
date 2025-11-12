const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = "majayjaytourismcircuitsystem";

app.use(cors());
app.use(express.json());

const db = mysql
  .createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "majayjay_tourism",
    waitForConnections: true,
    connectionLimit: 10,
  })
  .promise();

db.query("SELECT 1")
  .then(() => console.log("Connected to MySQL database"))
  .catch((err) => console.error("Database connection failed:", err.message));

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public/images"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

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
    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existingUser.length > 0)
      return res
        .status(409)
        .json({ success: false, message: "Username or email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, email, password_hash, first_name, middle_name, last_name, age, address, role, preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', ?)",
      [
        username,
        email,
        hashedPassword,
        first_name,
        middle_name || null,
        last_name,
        age || null,
        address || null,
        JSON.stringify([]),
      ]
    );

    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/users/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res
      .status(400)
      .json({ success: false, message: "Username/Email and password are required" });

  try {
    const [users] = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [identifier, identifier]
    );
    if (users.length === 0)
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    let parsedPreferences = [];
    try {
      parsedPreferences = user.preferences ? JSON.parse(user.preferences) : [];
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
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/users", authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, email, first_name, middle_name, last_name, age, address, role, preferences, banned FROM users"
    );
    const users = rows.map((u) => ({
      ...u,
      preferences: u.preferences ? JSON.parse(u.preferences) : [],
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/pois", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM pois");
    res.json(results);
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/pois", authenticateAdmin, async (req, res) => {
  const { name, description, tags, lat, lng, image, visitors } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO pois (name, description, tags, lat, lng, image, visitors) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, description, tags, lat, lng, image, visitors]
    );
    const [poi] = await db.query("SELECT * FROM pois WHERE id = ?", [result.insertId]);
    res.json(poi[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- UPDATED: POST /api/itineraries (returns new itinerary id) ----------
app.post("/api/itineraries", authenticateToken, async (req, res) => {
  const { name, route_data } = req.body;
  if (!route_data || !Array.isArray(route_data)) {
    return res.status(400).json({ message: "Invalid route data format" });
  }
  try {
    const [result] = await db.query(
      "INSERT INTO itineraries (user_id, name, route_data, status) VALUES (?, ?, ?, 'pending')",
      [req.user.id, name || "My Route", JSON.stringify(route_data)]
    );

    // Fetch the inserted itinerary row (optional, keeps your previous behavior)
    const [rows] = await db.query("SELECT * FROM itineraries WHERE id = ?", [result.insertId]);

    // Return the inserted id plus the saved itinerary object (route_data parsed)
    res.status(201).json({
      success: true,
      message: "Itinerary saved successfully",
      id: result.insertId, // <-- ADDED: return id for frontend
      itinerary: rows[0]
        ? {
            ...rows[0],
            route_data: JSON.parse(rows[0].route_data),
          }
        : null,
    });
  } catch (err) {
    console.error("Error saving itinerary:", err);
    res.status(500).json({ message: "Server error while saving itinerary" });
  }
});
// ---------------------------------------------------------------------------

app.get("/api/itineraries", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM itineraries WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    const itineraries = rows.map((row) => ({
      ...row,
      route_data: JSON.parse(row.route_data),
    }));
    res.json({ success: true, itineraries });
  } catch (err) {
    res.status(500).json({ message: "Server error while fetching itineraries" });
  }
});

app.get("/api/itineraries/:id", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM itineraries WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Itinerary not found" });
    const itinerary = {
      ...rows[0],
      route_data: JSON.parse(rows[0].route_data),
    };
    res.json({ success: true, itinerary });
  } catch (err) {
    res.status(500).json({ message: "Server error while fetching itinerary" });
  }
});

app.put("/api/itineraries/:id/status", authenticateToken, async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "finished", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  try {
    const [result] = await db.query(
      "UPDATE itineraries SET status = ? WHERE id = ? AND user_id = ?",
      [status, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error while updating itinerary status" });
  }
});
app.get("/api/users/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    let preferences = [];
    try {
      preferences = user.preferences ? JSON.parse(user.preferences) : [];
    } catch {}

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
      preferences,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/api/pois/recommended", authenticateToken, async (req, res) => {
  try {
    const [allPois] = await db.query("SELECT * FROM pois");

    // Fetch disliked POIs for this user
    const [feedback] = await db.query(
      "SELECT poi_id FROM user_feedback WHERE user_id = ? AND liked = 0",
      [req.user.id]
    );

    const dislikedIds = feedback.map(f => f.poi_id);

    // Filter out disliked POIs only from homepage recommendations
    const homepagePois = allPois.filter(poi => !dislikedIds.includes(poi.id));

    res.json({ success: true, pois: homepagePois });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/api/pois/recommended/liked", authenticateToken, async (req, res) => {
  try {
    // Get all POIs
    const [allPois] = await db.query("SELECT * FROM pois");

    // Get POIs liked by the user
    const [liked] = await db.query(
      "SELECT poi_id FROM user_feedback WHERE user_id = ? AND liked = 1",
      [req.user.id]
    );

    const likedIds = liked.map(f => f.poi_id);

    // Filter only liked POIs
    const recommendedPois = allPois.filter(poi => likedIds.includes(poi.id));

    res.json({ success: true, pois: recommendedPois });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ---------- HANDLE LIKE / DISLIKE POI (FIXED VERSION) ----------
app.post("/api/user_feedback", authenticateToken, async (req, res) => {
  let { poi_id, liked } = req.body;

  // Convert to numbers to avoid type mismatch
  poi_id = Number(poi_id);
  liked = Number(liked);

  if (isNaN(poi_id) || ![0, 1].includes(liked)) {
    return res.status(400).json({ success: false, message: "Invalid parameters" });
  }

  try {
    // Check if feedback already exists
    const [existing] = await db.query(
      "SELECT * FROM user_feedback WHERE user_id = ? AND poi_id = ?",
      [req.user.id, poi_id]
    );

    if (existing.length > 0) {
      // Update existing feedback
      await db.query(
        "UPDATE user_feedback SET liked = ? WHERE user_id = ? AND poi_id = ?",
        [liked, req.user.id, poi_id]
      );
    } else {
      // Insert new feedback
      await db.query(
        "INSERT INTO user_feedback (user_id, poi_id, liked) VALUES (?, ?, ?)",
        [req.user.id, poi_id, liked]
      );
    }

    res.json({ success: true, message: "Feedback saved successfully" });
  } catch (err) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// ✅ Update POI
app.put("/api/pois/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, tags, lat, lng, image, visitors } = req.body;

  try {
    const [result] = await db.query(
      "UPDATE pois SET name=?, description=?, tags=?, lat=?, lng=?, image=?, visitors=? WHERE id=?",
      [name, description, tags, lat, lng, image, visitors, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "POI not found" });
    }

    const [updatedPoi] = await db.query("SELECT * FROM pois WHERE id=?", [id]);
    res.json(updatedPoi[0]);
  } catch (err) {
    console.error("Error updating POI:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/upload-image", authenticateAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image uploaded" });
  res.json({ filename: req.file.filename });
});

app.get("/api/reports", authenticateAdmin, async (req, res) => {
  const type = req.query.type;
  try {
    if (type === "users") {
      let query = "SELECT id, username, email, role FROM users WHERE 1=1";
      const params = [];
      if (req.query.id) {
        query += " AND id = ?";
        params.push(req.query.id);
      }
      if (req.query.username) {
        query += " AND username LIKE ?";
        params.push(`%${req.query.username}%`);
      }
      if (req.query.email) {
        query += " AND email LIKE ?";
        params.push(`%${req.query.email}%`);
      }
      if (req.query.role) {
        query += " AND role = ?";
        params.push(req.query.role);
      }
      const [users] = await db.query(query, params);
      const totalUsers = users.filter((u) => u.role !== "admin").length;
      res.json({ totalUsers, users });
    } else if (type === "pois") {
      let query =
        "SELECT id, name, description, tags, lat, lng, image, visitors FROM pois WHERE 1=1";
      const params = [];
      if (req.query.id) {
        query += " AND id = ?";
        params.push(req.query.id);
      }
      if (req.query.name) {
        query += " AND name LIKE ?";
        params.push(`%${req.query.name}%`);
      }
      if (req.query.visitors) {
        query += " AND visitors >= ?";
        params.push(req.query.visitors);
      }
      const [pois] = await db.query(query, params);
      res.json({ totalPOIs: pois.length, pois });
    } else {
      res.status(400).json({ message: "Invalid report type" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.use(express.static(path.join(__dirname, "build")));
app.use("/images", express.static(path.join(__dirname, "public/images")));

app.get("/", (req, res) => res.redirect("/login"));
app.get("/*", (req, res) =>
  res.sendFile(path.join(__dirname, "build", "index.html"))
);

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
