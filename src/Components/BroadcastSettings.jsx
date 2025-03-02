import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";
import DropdownButtonDef from "../Components/DropdownButtonDef";
import {
  broadcastLanguages,
  brodcastProgrammArr,
  broadcastLangMapObj,
  brodcastProgrammMapObj,
} from "../Utils/Const";
import { useDispatch, useSelector } from "react-redux";
import { updateMergedUserSettings } from "../Redux/UserSettings/UserSettingsSlice";
import "../Pages/PagesCSS/BroadcastSettings.css";

const leftColSize = 4;
const rightColSize = 8;

export function BroadcastSettings({ props }) {
  const dispatch = useDispatch();
  const [showBroadcastSettings, setShowBroadcastSettings] = useState(() => {
    return localStorage.getItem("isBroadcastSettingsShown") === "true"
      ? false
      : true;
  });

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );
  const currentLangItem = broadcastLangMapObj[broadcastLangCode];
  const broadcastLangLabel = currentLangItem.label || "Unknown";

  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson"
  );
  const currentProgrammItem = brodcastProgrammMapObj[broadcastProgrammCode];
  const currentProgrammLabel = currentProgrammItem?.label || "Unknown";

  const updateBroadcastProgramm = (newProgrammItem) => {
    dispatch(
      updateMergedUserSettings({
        broadcast_programm_code: newProgrammItem.value,
      })
    );
  };

  const updateBroadcastLang = (newLangItem) => {
    dispatch(
      updateMergedUserSettings({ broadcast_language_code: newLangItem.value })
    );
  };

  const handleClose = () => {
    localStorage.setItem("isBroadcastSettingsShown", true);
    setShowBroadcastSettings(false);
  };

  const handleShow = () => setShowBroadcastSettings(true);

  return (
    <>
      <Button variant="light" onClick={handleShow} className="broadcast-button">
        <div className="side-menu-item-holder">
          <img
            src="/image/new_channel_icon.svg"
            alt="Channel Icon"
            className="broadcast-icon"
          />
          <span className="broadcast-label-main-val">
            {currentProgrammLabel}
          </span>
        </div>
      </Button>
      <Button variant="light" onClick={handleShow} className="broadcast-button">
        <div className="side-menu-item-holder">
          <img
            src="/image/globe_language_icon.svg"
            alt="Language Icon"
            className="broadcast-icon"
          />
          <span className="broadcast-label-main-last">
            {broadcastLangLabel}
          </span>
        </div>
      </Button>

      <Modal
        dialogClassName="broadcast-settings-dialog"
        show={showBroadcastSettings}
        onHide={handleClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Broadcasting Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            <Row className="broadcast-row">
              <Col xs={leftColSize} md={leftColSize}>
                <label className="broadcast-label">Chanel:</label>
              </Col>
              <Col xs={rightColSize} md={rightColSize}>
                <DropdownButtonDef
                  id="brodcast_programm"
                  data={brodcastProgrammArr}
                  currentValue={currentProgrammItem}
                  setDataRef={updateBroadcastProgramm}
                  className="btn-group broadcast-dropdown"
                  variant="light"
                ></DropdownButtonDef>
              </Col>
            </Row>
            <Row className="broadcast-row">
              <Col xs={leftColSize} md={leftColSize}>
                <label className="broadcast-label">Language:</label>
              </Col>
              <Col xs={rightColSize} md={rightColSize}>
                <DropdownButtonDef
                  id="brodcast_lang"
                  data={broadcastLanguages}
                  currentValue={currentLangItem}
                  setDataRef={updateBroadcastLang}
                  className="btn-group broadcast-dropdown"
                  variant="light"
                  disabled={false}
                ></DropdownButtonDef>
              </Col>
            </Row>
          </Container>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default BroadcastSettings;
