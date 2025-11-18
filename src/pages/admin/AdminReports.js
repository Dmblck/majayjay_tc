import React, { useState, useEffect, useRef } from "react";
export default function AdminReports() {
  const [activeReport, setActiveReport] = useState("users");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterColumn, setFilterColumn] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const reportRef = useRef();
  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport]);
  const fetchReport = async (type) => {
    setLoading(true);
    setError(null);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = user?.token;
      const res = await fetch(`http://localhost:5000/api/reports?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch report: ${res.status}`);
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };
  const handlePrint = () => {
    if (!reportRef.current) return;
    const printContent = reportRef.current.innerHTML;
    const WinPrint = window.open("", "", "width=900,height=650");
    WinPrint.document.write(`<html><head><title>Report</title></head><body>${printContent}</body></html>`);
    WinPrint.document.close();
    WinPrint.focus();
    WinPrint.print();
    WinPrint.close();
  };
  const sortData = (array) => {
    if (!filterColumn) return array;
    return [...array].sort((a, b) => {
      if (filterColumn === "id") return sortAsc ? a.id - b.id : b.id - a.id;
      if (filterColumn === "username" || filterColumn === "name")
        return sortAsc
          ? String(a[filterColumn]).localeCompare(String(b[filterColumn]))
          : String(b[filterColumn]).localeCompare(String(a[filterColumn]));
      if (filterColumn === "visitors") {
        const priority = { "Very High": 4, High: 3, Moderate: 2, Low: 1 };
        const aVal = priority[a.visitors] || 0;
        const bVal = priority[b.visitors] || 0;
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  };
  const renderReport = () => {
    if (loading) return <p style={{ fontSize: "18px" }}>Loading...</p>;
    if (error) return <p style={{ color: "red", fontSize: "18px" }}>{error}</p>;
    if (!reportData || reportData.length === 0)
      return <p style={{ fontSize: "18px" }}>No report available.</p>;

    const data = sortData(
      activeReport === "users" ? reportData.users || [] : reportData.pois || []
    );
    const tableStyle = {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "10px",
      fontSize: "18px",
      backgroundColor: "#f9f9f9",
    };
    const thStyle = {
      backgroundColor: "#3b82f6",
      color: "white",
      padding: "12px 10px",
      textAlign: "left",
    };
    const tdStyle = {
      border: "1px solid #ccc",
      padding: "10px",
    };
    if (activeReport === "users") {
      return (
        <div>
          <p style={{ fontSize: "18px" }}>
            <strong>Total Users:</strong> {reportData.totalUsers}
          </p>

          <div style={{ marginBottom: 15 }}>
            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              style={{
                padding: "8px 12px",
                fontSize: "16px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
            >
              <option value="">--Sort by--</option>
              <option value="id">ID</option>
              <option value="username">Username</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              style={{
                marginLeft: 10,
                padding: "8px 12px",
                fontSize: "16px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              {sortAsc ? "Ascending" : "Descending"}
            </button>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user) => (
                <tr key={user.id}>
                  <td style={tdStyle}>{user.id}</td>
                  <td style={tdStyle}>{user.username}</td>
                  <td style={tdStyle}>{user.email}</td>
                  <td style={tdStyle}>{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeReport === "pois") {
      return (
        <div>
          <p style={{ fontSize: "18px" }}>
            <strong>Total POIs:</strong> {reportData.totalPOIs}
          </p>

          <div style={{ marginBottom: 15 }}>
            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              style={{
                padding: "8px 12px",
                fontSize: "16px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
            >
              <option value="">--Sort by--</option>
              <option value="id">ID</option>
              <option value="name">Name</option>
              <option value="visitors">Visitors</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              style={{
                marginLeft: 10,
                padding: "8px 12px",
                fontSize: "16px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              {sortAsc ? "Ascending" : "Descending"}
            </button>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Visitors</th>
              </tr>
            </thead>
            <tbody>
              {data.map((poi) => (
                <tr key={poi.id}>
                  <td style={tdStyle}>{poi.id}</td>
                  <td style={tdStyle}>{poi.name}</td>
                  <td style={tdStyle}>{poi.visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <p>No report available.</p>;
  };
  return (
    <div style={{ marginLeft: 220, padding: 30 }}>
      <h2 style={{ fontSize: "28px", marginBottom: 20 }}>Admin Reports</h2>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setActiveReport("users")}
          style={{
            marginRight: 10,
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: activeReport === "users" ? "#3b82f6" : "#e5e7eb",
            color: activeReport === "users" ? "white" : "black",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          User Reports
        </button>
        <button
          onClick={() => setActiveReport("pois")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: activeReport === "pois" ? "#3b82f6" : "#e5e7eb",
            color: activeReport === "pois" ? "white" : "black",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          POI Reports
        </button>
      </div>
      <div ref={reportRef} style={{ marginBottom: 20 }}>
        {renderReport()}
      </div>
      <button
        onClick={handlePrint}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: "#10b981",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Print / Save as PDF
      </button>
    </div>
  );
}