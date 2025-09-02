// src/components/MqttLogsViewer.jsx
import React, { useState } from "react";
import { Typography, Paper, Box, Stack, IconButton } from "@mui/material";
import { useSelector } from "react-redux";
import { uniqBy } from "lodash";
import SortIcon from "@mui/icons-material/Sort";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

const messageTime = (message) => message.date ? new Date(message.date).getTime() : 0;

const MqttLogsViewer = () => {
  const mqttLogs = useSelector((state) => state.mqtt.mqttLogs);

  const [userSortOrder, setUserSortOrder] = useState("desc");
  const [messageSortOrder, setMessageSortOrder] = useState("desc");

  if (mqttLogs.length === 0) {
    return <Typography>No MQTT messages received yet.</Typography>;
  }

  const users = uniqBy(
    mqttLogs.map(({ username, firstName, lastName, clientId, date }) => ({
        username,
        firstName,
        lastName,
        clientId,
        date,
        timestamp: date ? new Date(date).getTime() : 0,
      }))
      .filter((u) => u.username && u.clientId)
      .sort((a, b) =>
        userSortOrder === "desc"
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp
      ),
    "username"
  );

  const sorted = mqttLogs.slice().sort((a, b) =>
    messageSortOrder === "desc"
      ? messageTime(b) - messageTime(a)
      : messageTime(a) - messageTime(b));

  return (
    <Box>
      {/* Connected Users */}
      <Box mb={3}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Users ({users.length})</Typography>
          <IconButton
            onClick={() =>
              setUserSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
            }
            title={`Sort users by time (${userSortOrder === "desc" ? "latest first" : "oldest first"})`}
          >
            <SortIcon />
            {userSortOrder === "desc" ? (
              <ArrowDownwardIcon />
            ) : (
              <ArrowUpwardIcon />
            )}
          </IconButton>
        </Stack>
        {users.map((user) => (
          <Typography key={user.clientId} sx={{ pl: 1 }}>
            🧑 {user.firstName} {user.lastName} ({user.username}) —{" "}
            {user.date ? new Date(user.date).toLocaleString() : "No time"}
          </Typography>
        ))}
      </Box>

      {/* MQTT Messages */}
      <Box mb={2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">
            MQTT Messages ({sorted.length})
          </Typography>
          <IconButton
            onClick={() =>
              setMessageSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
            }
            title={`Sort messages by time (${messageSortOrder === "desc" ? "latest first" : "oldest first"})`}
          >
            <SortIcon />
            {messageSortOrder === "desc" ? (
              <ArrowDownwardIcon />
            ) : (
              <ArrowUpwardIcon />
            )}
          </IconButton>
        </Stack>
      </Box>

      <Box>
        {sorted.map((message, index) => (
          <Paper key={index} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" style={{ display: "inline-block" }}>
              {message.topic}
            </Typography>
            <Typography variant="subtitle2" fontWeight="bold" style={{ display: "inline-block", float: "right" }}>
              {message.date}
            </Typography>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {JSON.stringify(message, null, 2)}
            </pre>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default MqttLogsViewer;
