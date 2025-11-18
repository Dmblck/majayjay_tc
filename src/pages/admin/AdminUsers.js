import React, { useState, useEffect } from "react";
export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;
  useEffect(() => {
    if (!token) {
      setError("No token found. Please login as admin.");
      return;
    }
    fetchUsers();
  }, [token]);
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) throw new Error("Unauthorized. Please login.");
      if (res.status === 403) throw new Error("Access denied. Admins only.");
      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      const admins = data.filter((u) => u.role === "admin");
      const others = data.filter((u) => u.role !== "admin");
      setUsers([...others, ...admins]);
      setError("");
    } catch (err) {
      console.error(err);
      setUsers([]);
      setError(err.message);
    }
  };
  const toggleBan = async (userId, currentlyBanned) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}/ban`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ban: !currentlyBanned }),
      });
      if (!res.ok) throw new Error("Failed to update ban status");
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };
  const viewUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };
  return (
    <div
      style={{
        marginLeft: "240px",
        padding: "30px",
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
        minHeight: "100vh",
        color: "#1e293b",
      }}
    >
      <h1
        style={{
          marginBottom: "25px",
          color: "#1d4ed8",
          fontSize: "2rem",
          fontWeight: 700,
          textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
        }}
      >
        All Users
      </h1>
      {error && <p style={{ color: "red", fontSize: "1.1rem" }}>{error}</p>}
      {users.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            transition: "all 0.3s ease",
          }}
        >
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "#1d4ed8", color: "#fff" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  style={{
                    textAlign: "center",
                    backgroundColor: user.banned ? "#fef2f2" : "#ffffff",
                    transition: "background-color 0.3s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f1f5f9")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = user.banned
                      ? "#fef2f2"
                      : "#ffffff")
                  }
                >
                  <td style={tdStyle}>{user.id}</td>
                  <td style={tdStyle}>{user.username}</td>
                  <td style={tdStyle}>{user.email}</td>
                  <td style={tdStyle}>{user.role}</td>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: "600",
                      color: user.banned ? "#dc2626" : "#16a34a",
                    }}
                  >
                    {user.banned ? "Banned" : "Active"}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => viewUser(user)}
                      style={actionBtnStyle("#1d4ed8")}
                    >
                      View
                    </button>
                    {user.role !== "admin" && (
                      <button
                        onClick={() => toggleBan(user.id, user.banned)}
                        style={actionBtnStyle(
                          user.banned ? "#16a34a" : "#dc2626"
                        )}
                      >
                        {user.banned ? "Unban" : "Ban"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && selectedUser && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2
              style={{
                marginBottom: "15px",
                color: "#1d4ed8",
                fontWeight: "700",
              }}
            >
              User Details
            </h2>
            <div style={{ fontSize: "1rem", lineHeight: "1.7" }}>
              <p><strong>ID:</strong> {selectedUser.id}</p>
              <p><strong>Username:</strong> {selectedUser.username}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>First Name:</strong> {selectedUser.first_name}</p>
              <p><strong>Middle Name:</strong> {selectedUser.middle_name || "-"}</p>
              <p><strong>Last Name:</strong> {selectedUser.last_name}</p>
              <p><strong>Age:</strong> {selectedUser.age || "-"}</p>
              <p><strong>Role:</strong> {selectedUser.role}</p>
              <p><strong>Preferences:</strong> {selectedUser.preferences?.length ? selectedUser.preferences.join(", ") : "-"}</p>
              <p><strong>Address:</strong> {selectedUser.address || "-"}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color: selectedUser.banned ? "#dc2626" : "#16a34a",
                    fontWeight: 600,
                  }}
                >
                  {selectedUser.banned ? "Banned" : "Active"}
                </span>
              </p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              style={{
                ...actionBtnStyle("#1d4ed8"),
                marginTop: "20px",
                width: "100%",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "1.05rem",
};
const thStyle = {
  padding: "14px",
  textAlign: "center",
  fontWeight: 600,
  letterSpacing: "0.5px",
};
const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  textAlign: "center",
  color: "#334155",
};
const actionBtnStyle = (bgColor) => ({
  padding: "8px 14px",
  margin: "0 5px",
  background: bgColor,
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: 500,
  transition: "background 0.3s ease, transform 0.2s ease",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  transform: "scale(1)",
  outline: "none",
});
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};
const modalStyle = {
  background: "#fff",
  padding: "25px 30px",
  borderRadius: "12px",
  minWidth: "400px",
  maxWidth: "500px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
  animation: "fadeIn 0.3s ease",
};