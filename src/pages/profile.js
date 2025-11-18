import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const token = storedUser?.token;
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: editName,
          email: editEmail,
          first_name: user.first_name || "",
          middle_name: user.middle_name || "",
          last_name: user.last_name || "",
          age: user.age || null,
          address: user.address || "",
          password: "",
          confirm_password: "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to update profile");
        return;
      }

      // Update UI
      setUser({
        ...user,
        username: editName,
        email: editEmail,
      });

      // Update localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          username: editName,
          email: editEmail,
        })
      );

      alert("Profile updated successfully!");
      setShowModal(false);
    } catch (err) {
      alert("Something went wrong.");
      console.error(err);
    }
      try {
    const payload = {
      username: editName,
      email: editEmail,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      age: user.age,
      address: user.address,
    };

    if (password) {
      if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }
      payload.password = password;
      payload.confirm_password = confirmPassword;
    }

    const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) return alert(data.message || "Failed to update profile");

    setUser({ ...user, ...payload });
    localStorage.setItem("user", JSON.stringify({ ...storedUser, ...payload }));
    alert("Profile updated successfully!");
    setShowModal(false);
    setPassword("");
    setConfirmPassword("");
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
  };

  // Fetch user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!storedUser?.id || !token) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/api/users/${storedUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Failed to load profile");

        setUser(data);
        setPreferences(Array.isArray(data.preferences) ? data.preferences : []);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [storedUser?.id, token]);

  // Fetch itineraries
  useEffect(() => {
    const loadItineraries = async () => {
      if (!token) return;

      try {
        const res = await fetch("http://localhost:5000/api/itineraries", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.itineraries)) {
          setItineraries(data.itineraries);
        } else {
          setItineraries([]);
        }
      } catch (err) {
        console.error("Error fetching itineraries:", err);
      }
    };

    loadItineraries();
  }, [token]);

  // Handle itinerary click
  const handleItineraryClick = async (itinerary) => {
    if (!token) return alert("Please login first.");

    try {
      const res = await fetch(`http://localhost:5000/api/itineraries/${itinerary.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Ensure route_data exists
      const routeData = data.itinerary?.route_data || itinerary.route_data;
      const startPoint = data.itinerary?.startPoint || itinerary.startPoint;

      if (routeData && routeData.length > 0) {
        navigate("/routedetails", {
          state: {
            filteredPois: routeData,
            startPoint: startPoint || null,
            routeId: itinerary.id,
          },
        });
      } else {
        alert("This itinerary has no route data.");
      }
    } catch (err) {
      console.error("Error fetching itinerary:", err);
      // fallback: use saved data
      if (itinerary.route_data && itinerary.route_data.length > 0) {
        navigate("/routedetails", {
          state: {
            filteredPois: itinerary.route_data,
            startPoint: itinerary.startPoint || null,
            routeId: itinerary.id,
          },
        });
      } else {
        alert("Could not load itinerary details.");
      }
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading)
    return (
      <div style={{ padding: "24px", fontSize: "1.2rem", textAlign: "center" }}>
        Loading your profile...
      </div>
    );

  if (error)
    return (
      <div style={{ padding: "24px", fontSize: "1.2rem", textAlign: "center", color: "red" }}>
        {error}
      </div>
    );

  const pendingItineraries = itineraries.filter((it) => it.status === "pending" || it.status === "in-progress");
  const finishedItineraries = itineraries.filter((it) => it.status === "finished");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #c8e6c9, #bbdefb)", padding: "40px 20px", fontFamily: "Segoe UI, sans-serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", borderRadius: "20px", padding: "30px 40px", boxShadow: "0 8px 25px rgba(0,0,0,0.15)" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "700", textAlign: "center", color: "#0d47a1", marginBottom: "30px" }}>User Profile</h1>

        {/* User Info */}
        <div style={{ borderRadius: "16px", padding: "24px", background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", marginBottom: "28px" }}>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Full Name:</strong> {`${user.first_name || ""} ${user.middle_name || ""} ${user.last_name || ""}`}</p>
          <p><strong>Age:</strong> {user.age || "Not provided"}</p>
          <button
            onClick={() => {
              setEditName(user?.username);
              setEditEmail(user?.email);
              setShowModal(true);
            }}
            style={{
              padding: "12px 30px",
              background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "1rem",
              boxShadow: "0 6px 15px rgba(0,0,0,0.2)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Edit Profile
          </button>

          <button onClick={handleLogout}             
            style={{
              padding: "12px 30px",
              background: "linear-gradient(135deg, #e51e28ff, #f30c20ff)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: 600,
              marginLeft: "10px",
              fontSize: "1rem",
              boxShadow: "0 6px 15px rgba(0,0,0,0.2)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
            Logout
          </button>
        </div>

        {/* Pending Itineraries */}
        {pendingItineraries.length > 0 && (
          <div style={{ borderRadius: "16px", padding: "24px", background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", marginBottom: "28px" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "#0d47a1" }}>Pending / In-Progress Routes</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {pendingItineraries.map((itinerary) => (
                <li key={itinerary.id} onClick={() => handleItineraryClick(itinerary)} style={{ background: "rgba(255,244,229,0.9)", borderRadius: "12px", padding: "14px 18px", marginBottom: "10px", boxShadow: "0 3px 8px rgba(0,0,0,0.08)", cursor: "pointer" }}>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "#ff9800" }}>{itinerary.name}</strong><br />
                    <span>Status: {itinerary.status}</span><br />
                    <small style={{ color: "#616161" }}>Saved on: {itinerary.created_at ? new Date(itinerary.created_at).toLocaleString() : "Unknown date"}</small>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Finished Itineraries */}
        {finishedItineraries.length > 0 && (
          <div style={{ borderRadius: "16px", padding: "24px", background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "#0d47a1" }}>Finished Routes</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {finishedItineraries.map((itinerary) => (
                <li key={itinerary.id} onClick={() => handleItineraryClick(itinerary)} style={{ background: "rgba(227,242,253,0.9)", borderRadius: "12px", padding: "14px 18px", marginBottom: "10px", boxShadow: "0 3px 8px rgba(0,0,0,0.08)", cursor: "pointer" }}>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "#0d47a1" }}>{itinerary.name}</strong><br />
                    <span>Status: {itinerary.status}</span><br />
                    <small style={{ color: "#616161" }}>Saved on: {itinerary.created_at ? new Date(itinerary.created_at).toLocaleString() : "Unknown date"}</small>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
        {showModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "30px",
                borderRadius: "20px",
                width: "500px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              <h2 style={{ gridColumn: "1 / -1", fontSize: "1.6rem", fontWeight: "700", color: "#0d47a1", marginBottom: "20px", textAlign: "center" }}>
                Edit Profile
              </h2>

              <label>Username</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}
              />

              <label>Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}
              />

              <label>First Name</label>
              <input
                type="text"
                value={user.first_name || ""}
                onChange={(e) => setUser({ ...user, first_name: e.target.value })}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}
              />

              <label>Middle Name</label>
              <input
                type="text"
                value={user.middle_name || ""}
                onChange={(e) => setUser({ ...user, middle_name: e.target.value })}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}
              />

              <label>Last Name</label>
              <input
                type="text"
                value={user.last_name || ""}
                onChange={(e) => setUser({ ...user, last_name: e.target.value })}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}
              />

              <label>Age</label>
              <input
                type="number"
                value={user.age || ""}
                onChange={(e) => setUser({ ...user, age: e.target.value })}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}
              />

              <label>Address</label>
              <input
                type="text"
                value={user.address || ""}
                onChange={(e) => setUser({ ...user, address: e.target.value })}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}
              />

              {/* Password Fields */}
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}
              />

              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}
              />

              {/* Buttons */}
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "15px", marginTop: "10px" }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ padding: "10px 20px", background: "#757575", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  style={{ padding: "10px 20px", background: "#1e88e5", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
