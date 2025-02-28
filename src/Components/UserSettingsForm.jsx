import React, { useState } from "react";
import { Form, Card, Container, Row, Col } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { updateMergedUserSettings } from "../Redux/UserSettings/UserSettingsSlice";
import { setDebugLogMode, setUseTraceMode } from "../Utils/debugLog";
import { broadcastLanguages, brodcastProgrammArr } from "../Utils/Const";

const UserSettingsForm = () => {
  const dispatch = useDispatch();
  const userSettings = useSelector((state) => state.userSettings.userSettings);

  const [debugMode, setDebugMode] = useState(
    localStorage.getItem("debugLog") === "true"
  );
  const [useTrace, setUseTrace] = useState(
    localStorage.getItem("useTrace") === "true"
  );

  const paginationOptions = [10, 20, 30];

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

  const handleSourcePaginationChange = (event) => {
    dispatch(
      updateMergedUserSettings({
        source_pagination: { page: 1, limit: Number(event.target.value) },
      })
    );
  };

  const handleArchivePaginationChange = (event) => {
    dispatch(
      updateMergedUserSettings({
        archive_pagination: { page: 1, limit: Number(event.target.value) },
      })
    );
  };

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

  return (
    <Container className="mt-4">
      <Row className="d-flex align-items-stretch">
        <Col md={4} className="d-flex">
          <Card className="shadow-lg p-4 flex-fill">
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
          <Card className="shadow-lg p-4 flex-fill">
            <Card.Title className="mb-3">📡 Broadcast Settings</Card.Title>
            <Card.Body>
              <Form.Group controlId="broadcast-program">
                <Form.Label>📡 Select Broadcast Program:</Form.Label>
                <Form.Select
                  value={userSettings.broadcast_programm_code}
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
                  value={userSettings.broadcast_language_code}
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

        <Col md={4} className="d-flex">
          <Card className="shadow-lg p-4 flex-fill">
            <Card.Title className="mb-3">📑 Pagination Settings</Card.Title>
            <Card.Body>
              <Form.Group controlId="source-pagination">
                <Form.Label>📄 Source Page Limit:</Form.Label>
                <Form.Select
                  value={userSettings.source_pagination?.limit || 10}
                  onChange={handleSourcePaginationChange}
                >
                  {paginationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} rows per page
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group controlId="archive-pagination" className="mt-3">
                <Form.Label>📂 Archive Page Limit:</Form.Label>
                <Form.Select
                  value={userSettings.archive_pagination?.limit || 10}
                  onChange={handleArchivePaginationChange}
                >
                  {paginationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} rows per page
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

export default UserSettingsForm;
