import React, { useState, useEffect } from "react";
import { setDebugLogMode } from "../Utils/debugLog";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Container, Card, Form, Row, Col } from "react-bootstrap";

const Settings = () => {
  const navigate = useNavigate();

  const userProfile = useSelector(
    (state) => state.UserProfile?.userProfile?.profile
  );
  const securityRole = userProfile?.securityRole;
  const userEmail = userProfile?.email || "No Email Provided";

  const [debugMode, setDebugMode] = useState(
    localStorage.getItem("debugLog") === "true"
  );

  useEffect(() => {
    if (securityRole !== "admin") {
      navigate("/subtitle");
    }
  }, [securityRole, navigate]);

  const toggleDebugMode = () => {
    const newMode = !debugMode;
    setDebugMode(newMode);
    setDebugLogMode(newMode);
  };

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        {/* Settings Section */}
        <Col md={6}>
          <Card className="shadow-lg p-4">
            <Card.Title className="text-center mb-3">⚙️ Settings</Card.Title>
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

        {/* User Info Section */}
        <Col md={4}>
          <Card className="shadow-lg p-4">
            <Card.Title className="text-center mb-3">
              👤 User Information
            </Card.Title>
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
    </Container>
  );
};

export default Settings;
