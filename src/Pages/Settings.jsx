import React, { useState, useEffect } from "react";
import { setDebugLogMode } from "../Utils/debugLog";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Container, Card, Form, Row, Col } from "react-bootstrap";
import { updateMergedUserSettings } from "../Redux/UserSettings/UserSettingsSlice";
import { broadcastLanguages, brodcastProgrammArr } from "../Utils/Const";

const Settings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get user data
  const userProfile = useSelector(
    (state) => state.UserProfile?.userProfile?.profile
  );
  const securityRole = userProfile?.securityRole;
  const userEmail = userProfile?.email || "No Email Provided";

  // Get Redux broadcast settings
  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );
  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson"
  );

  // Debug Mode State (Still using localStorage)
  const [debugMode, setDebugMode] = useState(
    localStorage.getItem("debugLog") === "true"
  );

  useEffect(() => {
    if (securityRole !== "admin") {
      navigate("/subtitle");
    }
  }, [securityRole, navigate]);

  // Toggle Debug Mode
  const toggleDebugMode = () => {
    const newMode = !debugMode;
    setDebugMode(newMode);
    setDebugLogMode(newMode);
  };

  // Broadcast Settings Handlers
  const handleProgramChange = (event) => {
    dispatch(
      updateMergedUserSettings({ broadcast_programm_code: event.target.value })
    );
  };

  const handleLanguageChange = (event) => {
    dispatch(
      updateMergedUserSettings({ broadcast_language_code: event.target.value })
    );
  };

  return (
    <Container className="mt-4">
      <Row className="d-flex align-items-stretch">
        {" "}
        {/* Ensures equal height */}
        <Col md={4} className="d-flex">
          {" "}
          {/* General Settings */}
          <Card className="shadow-lg p-4 flex-fill">
            {" "}
            {/* flex-fill ensures equal height */}
            <Card.Title className="mb-3">⚙️ General Settings</Card.Title>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3 d-flex align-items-center">
                  <Form.Check
                    type="switch"
                    id="debug-log-toggle"
                    label="Enable Debug Logs"
                    checked={debugMode}
                    onChange={toggleDebugMode}
                    className="me-2"
                  />
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="d-flex">
          {" "}
          {/* User Information */}
          <Card className="shadow-lg p-4 flex-fill">
            {" "}
            {/* flex-fill ensures equal height */}
            <Card.Title className="mb-3">👤 User Information</Card.Title>
            <Card.Body>
              <p>
                <strong>Email:</strong> {userEmail}
              </p>
              <p>
                <strong>Role:</strong> {securityRole}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={4}>
          {" "}
          {/* Broadcast Settings */}
          <Card className="shadow-lg p-4">
            <Card.Title className="mb-3">📡 Broadcast Settings</Card.Title>
            <Card.Body>
              <Form.Group controlId="broadcast-program">
                <Form.Label>📡 Select Broadcast Program:</Form.Label>
                <Form.Select
                  value={broadcastProgrammCode}
                  onChange={handleProgramChange}
                >
                  {brodcastProgrammArr.map((program) => (
                    <option key={program.value} value={program.value}>
                      {program.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group controlId="broadcast-language" className="mt-3">
                <Form.Label>🌍 Select Broadcast Language:</Form.Label>
                <Form.Select
                  value={broadcastLangCode}
                  onChange={handleLanguageChange}
                >
                  {broadcastLanguages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Settings;
