import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null); // ✅ important: reset state
    navigate("/login");
  };

  if (!user) return null;

  const isAdmin = user.role === "admin";

  // --- Admin Sidebar ---
  if (isAdmin) {
    return (
      <div
        style={{
          width: "220px",
          height: "100vh",
          background: "#2563eb",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          position: "fixed",
        }}
      >
        <h2 style={{ marginBottom: "24px" }}>Admin Panel</h2>
        <Link to="/admin/dashboard" style={{ color: "#fff", textDecoration: "none", marginBottom: "16px" }}>Dashboard</Link>
        <Link to="/admin/pois" style={{ color: "#fff", textDecoration: "none", marginBottom: "16px" }}>Manage POIs</Link>
        <Link to="/admin/users" style={{ color: "#fff", textDecoration: "none", marginBottom: "16px" }}>Manage Users</Link>
        <Link to="/admin/reports" style={{ color: "#fff", textDecoration: "none", marginBottom: "16px" }}>Reports</Link>
        <button
          onClick={handleLogout}
          style={{
            marginTop: "auto",
            background: "red",
            border: "none",
            color: "#fff",
            padding: "10px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  // --- Regular User Topbar ---
  return (
    <nav
      style={{
        padding: "12px 20px",
        background: "#2563eb",
        color: "#fff",
        display: "flex",
        gap: "20px",
        alignItems: "center",
      }}
    >
      <Link to="/home" style={{ color: "#fff", textDecoration: "none" }}>Home</Link>
      <Link to="/mappage" style={{ color: "#fff", textDecoration: "none" }}>Map</Link>
      <Link to="/establishments" style={{ color: "#fff", textDecoration: "none" }}>Establishments</Link>
      <Link to="/natureculture" style={{ color: "#fff", textDecoration: "none" }}>Nature & Culture</Link>
      <div style={{ marginLeft: "auto", position: "relative" }} ref={menuRef}>
        <div
          onClick={() => setMenuOpen(prev => !prev)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#fff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          👤
        </div>
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "48px",
              background: "#fff",
              color: "#333",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              overflow: "hidden",
              zIndex: 100,
            }}
          >
            <button
              onClick={() => { navigate("/profile"); setMenuOpen(false); }}
              style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", color: "red", cursor: "pointer" }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
