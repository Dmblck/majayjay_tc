import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage({ setUser }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        if (data.user.banned) {
          setError(
            "Your account has been banned. Please contact the administrator."
          );
          return;
        }

        // Save user and token together
        const storedUser = {
          token: data.token,
          ...data.user,
        };
        localStorage.setItem("user", JSON.stringify(storedUser));

        // Update state if needed
        if (setUser) setUser(data.user);

        // Redirect based on role
        if (data.user.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/home");
        }
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setError("Server error, please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Login</h2>
        {error && <p className="error" style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email or Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter email or username"
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="signup-text">
          Don't have an account?{" "}
          <span
            style={{ color: "#1d4ed8", cursor: "pointer" }}
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}
