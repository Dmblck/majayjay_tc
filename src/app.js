import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HomePage from "./pages/Home";
import MapPage from "./pages/MapPage";
import NatureCulturePage from "./pages/NatureCulture";
import EstablishmentsPage from "./pages/Establishments";
import ProfilePage from "./pages/profile";
import RouteDetails from "./pages/RouteDetails";
import Navbar from "./components/NavBar";

// Admin pages (make sure these are React components in .js files)
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPOIs from "./pages/admin/AdminPOIs";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminML from "./pages/admin/AdminML";
import AdminReports from "./pages/admin/AdminReports";

function PathTracker() {
  const location = useLocation();
  useEffect(() => {
    localStorage.setItem("lastPath", location.pathname);
  }, [location]);
  return null;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const lastPath = localStorage.getItem("lastPath");
    const currentPath = window.location.pathname;

    if (lastPath && currentPath === "/") {
      window.history.replaceState({}, "", lastPath);
    }
    setInitialized(true);
  }, []);

  if (!initialized) return null;

  const isAdmin = user?.role === "admin";

  const DefaultRedirect = () => {
    if (!user) return <Navigate to="/login" replace />;
    return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/home" replace />;
  };

  return (
    <Router>
      <PathTracker />
      {user && <Navbar user={user} setUser={setUser} />}
      <Routes>
        <Route path="/" element={<DefaultRedirect />} />
        <Route path="/login" element={!user ? <LoginPage setUser={setUser} /> : <DefaultRedirect />} />
        <Route path="/signup" element={!user ? <SignupPage /> : <DefaultRedirect />} />
        <Route path="/home" element={user ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/mappage" element={user ? <MapPage /> : <Navigate to="/login" replace />} />
        <Route path="/natureculture" element={user ? <NatureCulturePage /> : <Navigate to="/login" replace />} />
        <Route path="/establishments" element={user ? <EstablishmentsPage /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" replace />} />
        <Route path="/routedetails" element={user ? <RouteDetails /> : <Navigate to="/login" replace />} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={isAdmin ? <AdminDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/pois" element={isAdmin ? <AdminPOIs /> : <Navigate to="/login" replace />} />
        <Route path="/admin/users" element={isAdmin ? <AdminUsers /> : <Navigate to="/login" replace />} />
        <Route path="/admin/ml" element={isAdmin ? <AdminML /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports" element={isAdmin ? <AdminReports /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
