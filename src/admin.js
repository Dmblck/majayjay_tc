import React from "react";
import { createRoot } from "react-dom/client";
import AdminDashboard from "./pages/AdminDashboard";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<AdminDashboard />);
