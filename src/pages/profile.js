import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const token = storedUser?.token;
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const preferenceOptions = ["Nature", "Culture", "Food", "History", "Adventure"];

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

  // Toggle preference
  const handleTogglePreference = (option) => {
    setPreferences((prev) =>
      prev.includes(option) ? prev.filter((p) => p !== option) : [...prev, option]
    );
  };

  // Save preferences
  const handleSavePreferences = async () => {
    if (!user || !token) return alert("No token found. Please login again.");

    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save preferences");

      setUser({ ...user, preferences });
      setEditing(false);
      alert("Preferences saved successfully!");
    } catch (err) {
      console.error("Error saving preferences:", err);
      alert(`Error saving preferences: ${err.message}`);
    }
  };

  // Handle itinerary click
  const handleItineraryClick = async (itinerary) => {
    if (!token) return alert("Please login first.");

    try {
      const res = await fetch(`http://localhost:5000/api/itineraries/${itinerary.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.itinerary?.route_data) {
              navigate("/routedetails", {
        state: {
          filteredPois: data.itinerary.route_data, // send the saved route
          startPoint: data.itinerary.startPoint, // if you store it
          routeId: data.itinerary.id,
        },
      });

      } else {
        alert("Could not load itinerary details.");
      }
    } catch (err) {
      console.error("Error fetching itinerary:", err);
      alert("Error fetching itinerary details.");
    }
  };

  // Logout function
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

          {/* Preferences */}
          <div style={{ marginTop: "16px" }}>
            <strong>Preferences:</strong>
            {editing ? (
              <div>
                {preferenceOptions.map((option) => (
                  <label key={option} style={{ display: "block", marginTop: "8px", cursor: "pointer" }}>
                    <input type="checkbox" value={option} checked={preferences.includes(option)} onChange={() => handleTogglePreference(option)} style={{ marginRight: "6px" }} />
                    {option}
                  </label>
                ))}
                <div style={{ marginTop: "16px" }}>
                  <button onClick={handleSavePreferences} style={{ background: "#1976d2", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "8px", cursor: "pointer", marginRight: "10px" }}>
                    Save
                  </button>
                  <button onClick={() => { setPreferences(user.preferences || []); setEditing(false); }} style={{ background: "#bdbdbd", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                {preferences.length > 0 ? preferences.map((p, i) => (<li key={i} style={{ color: "#2e7d32", fontWeight: "500" }}>{p}</li>)) : <li>No preferences set.</li>}
              </ul>
            )}
          </div>

          {!editing && (
            <button onClick={() => setEditing(true)} style={{ marginTop: "16px", background: "#43a047", color: "#fff", padding: "10px 22px", border: "none", borderRadius: "8px", cursor: "pointer" }}>
              Edit Preferences
            </button>
          )}

          <button onClick={handleLogout} style={{ marginTop: "16px", marginLeft: "10px", background: "#e53935", color: "#fff", padding: "10px 22px", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            Logout
          </button>
        </div>

        {/* Saved Itineraries */}
        <div style={{ borderRadius: "16px", padding: "24px", background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "#0d47a1" }}>Saved Itineraries</h2>
          {itineraries.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {itineraries.map((itinerary) => (
                <li key={itinerary.id} onClick={() => handleItineraryClick(itinerary)} style={{ background: "rgba(227,242,253,0.9)", borderRadius: "12px", padding: "14px 18px", marginBottom: "10px", boxShadow: "0 3px 8px rgba(0,0,0,0.08)", cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "#0d47a1" }}>{itinerary.name}</strong><br />
                    <span>Status: {itinerary.status || "N/A"}</span><br />
                    <small style={{ color: "#616161" }}>Saved on: {itinerary.created_at ? new Date(itinerary.created_at).toLocaleString() : "Unknown date"}</small>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#555" }}>No itineraries found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
