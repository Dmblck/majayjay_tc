const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "majayjay_tourism",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

async function rehashPasswords() {
  try {
    const [users] = await db.query("SELECT id, password_hash FROM users");

    for (const user of users) {
      // Use the correct column
      const currentPassword = user.password_hash;

      // Skip if already bcrypt hash (starts with $2)
      if (!currentPassword || currentPassword.startsWith("$2")) continue;

      const hashed = await bcrypt.hash(currentPassword, 10);
      await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashed, user.id]);
      console.log(`Rehashed password for user ID ${user.id}`);
    }

    console.log("All passwords updated successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

rehashPasswords();
