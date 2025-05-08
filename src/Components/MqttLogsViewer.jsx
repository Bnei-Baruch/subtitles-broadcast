// src/components/MqttLogsViewer.jsx
import React, { useState } from "react";
import { Typography, Paper, Box, Grid, IconButton, Stack } from "@mui/material";
import { useSelector } from "react-redux";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";

const MqttLogsViewer = () => {
  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);
  const [viewMode, setViewMode] = useState("list");

  const toggleView = () => {
    setViewMode((prev) => (prev === "list" ? "grid" : "list"));
  };

  if (Object.entries(mqttMessages).length === 0) {
    return <Typography>No MQTT messages received yet.</Typography>;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <IconButton onClick={toggleView} title="Toggle view mode">
          {viewMode === "list" ? <GridViewIcon /> : <ViewListIcon />}
        </IconButton>
      </Stack>

      {viewMode === "list" ? (
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
      ) : (
        <Grid container spacing={2}>
          {Object.entries(mqttMessages).map(([topic, message]) => (
            <Grid item xs={12} sm={6} md={4} key={topic}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {topic}
                </Typography>
                <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                  {JSON.stringify(message, null, 2)}
                </pre>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MqttLogsViewer;
