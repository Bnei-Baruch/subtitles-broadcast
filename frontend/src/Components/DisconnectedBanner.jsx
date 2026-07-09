import React from "react";
import { useSelector } from "react-redux";

export function DisconnectedBanner() {
  const isConnected = useSelector((state) => state.mqtt.isConnected);
  if (isConnected) return null;
  return (
    <div style={{ background: "#c62828", color: "#fff", textAlign: "center", padding: "4px" }}>
      MQTT disconnected — changes are not broadcast
    </div>
  );
}

export default DisconnectedBanner;
