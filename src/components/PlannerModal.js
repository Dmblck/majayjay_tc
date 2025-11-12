import React from "react";

export default function PlannerModal({
  show,
  startTime,
  setStartTime,
  scheduledDate,
  setScheduledDate,
  mode,
  setMode,
  startChoice,
  setStartChoice,
  selectedStartPoi,
  setSelectedStartPoi,
  pois,
  onConfirm,
  onCancel,
}) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          width: 340,
          textAlign: "center",
        }}
      >
        <h3>Plan Your Trip</h3>

        {/* Start Time */}
        <label>
          <input
            type="radio"
            value="now"
            checked={startTime === "now"}
            onChange={() => setStartTime("now")}
          />{" "}
          Start Now
        </label>
        <br />
        <label>
          <input
            type="radio"
            value="later"
            checked={startTime === "later"}
            onChange={() => setStartTime("later")}
          />{" "}
          Start Later
        </label>
        {startTime === "later" && (
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            style={{ marginTop: 8, display: "block", width: "100%" }}
          />
        )}

        <hr />

        {/* Transport Mode */}
        <label>Mode of Transport:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{ display: "block", margin: "8px auto" }}
        >
          <option value="foot">On Foot</option>
          <option value="bike">Bike</option>
          <option value="motor">Motor</option>
          <option value="car">Car</option>
        </select>

        <hr />

        {/* Starting Point */}
        <label>Starting Point:</label>
        <div>
          <label>
            <input
              type="radio"
              value="address"
              checked={startChoice === "address"}
              onChange={() => setStartChoice("address")}
            />{" "}
            My Address
          </label>
          <br />
          <label>
            <input
              type="radio"
              value="poi"
              checked={startChoice === "poi"}
              onChange={() => setStartChoice("poi")}
            />{" "}
            Choose a POI
          </label>
        </div>

        {startChoice === "poi" && (
          <select
            value={selectedStartPoi}
            onChange={(e) => setSelectedStartPoi(e.target.value)}
            style={{ marginTop: 8, width: "100%" }}
          >
            <option value="">Select a POI</option>
            {pois.map((poi) => (
              <option key={poi.id} value={poi.id}>
                {poi.name}
              </option>
            ))}
          </select>
        )}

        <div style={{ marginTop: 16 }}>
          <button onClick={onConfirm} style={{ marginRight: 8 }}>
            Confirm
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}