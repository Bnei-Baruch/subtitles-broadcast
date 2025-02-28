import React, { useState } from "react";
import { setDebugLogMode, setUseTraceMode } from "../Utils/debugLog";
import { useSelector, useDispatch } from "react-redux";
import { Container, Card, Form, Row, Col } from "react-bootstrap";
import { updateMergedUserSettings } from "../Redux/UserSettings/UserSettingsSlice";
import { broadcastLanguages, brodcastProgrammArr } from "../Utils/Const";

const Settings = () => {
  const dispatch = useDispatch();

  const userProfile = useSelector(
    (state) => state.UserProfile?.userProfile?.profile
  );
  const securityRole = userProfile?.securityRole;
  const userEmail = userProfile?.email || "No Email Provided";

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );

  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson"
  );

  const [debugMode, setDebugMode] = useState(
    localStorage.getItem("debugLog") === "true"
  );

  const [useTrace, setUseTrace] = useState(
    localStorage.getItem("useTrace") === "true"
  );

  const toggleDebugMode = () => {
    const newMode = !debugMode;
    setDebugMode(newMode);
    setDebugLogMode(newMode);
  };

  const toggleUseTrace = () => {
    const newMode = !useTrace;
    setUseTrace(newMode);
    setUseTraceMode(newMode);
  };

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
        <Col md={4} className="d-flex">
          {" "}
          <Card className="shadow-lg p-4 flex-fill">
            {" "}
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
                <Form.Group className="mb-3 d-flex align-items-center">
                  <Form.Check
                    type="switch"
                    id="use-trace-toggle"
                    label="Use Console Trace (instead of Log)"
                    checked={useTrace}
                    onChange={toggleUseTrace}
                    className="me-2"
                  />
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="d-flex">
          {" "}
          <Card className="shadow-lg p-4 flex-fill">
            {" "}
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
