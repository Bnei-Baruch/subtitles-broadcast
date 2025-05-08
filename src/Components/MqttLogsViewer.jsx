// src/components/MqttLogsViewer.jsx
import React from "react";
import { useSelector } from "react-redux";
import { Typography, Paper, Box } from "@mui/material";

const MqttLogsViewer = () => {
  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);

  if (Object.entries(mqttMessages).length === 0) {
    return <Typography>No MQTT messages received yet.</Typography>;
  }

  return (
    <Box>
      {Object.entries(mqttMessages).map(([topic, message]) => (
        <Paper key={topic} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {topic}
          </Typography>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {JSON.stringify(message, null, 2)}
          </pre>
        </Paper>
      ))}
    </Box>
  );
};

export default MqttLogsViewer;
