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

const leftColSize = 4;
const rightColSize = 8;

const styles = {
  buttonPrimary: {
    // width: "390px",
    textAlign: "left",
    backgroundColor: "transparent",
    transition: "none",
    border: "none",
    paddingTop: "3px",
  },
  row: {
    height: "50px",
  },
  label: {
    marginTop: "6px",
  },
  dropDown: {
    width: "160px",
    border: "1px solid grey",
  },
  icon: {
    marginLeft: "3px",
  },
  labelMain: {
    marginRight: "3px",
    cursor: "pointer",
  },
  labelMainVal: {
    marginRight: "5px",
    // fontWeight: "bold",
    fontSize: "14px",
    width: "135px",
    display: "inline-block",
  },
  labelMainLast: {
    // fontWeight: "bold",
    fontSize: "14px",
    width: "75px",
    display: "inline-block",
  },
};

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
      <Button variant="light" onClick={handleShow} style={styles.buttonPrimary}>
        <div className="side-menu-item-holder">
          <img
            src="/image/new_channel_icon.svg"
            alt="Channel Icon"
            className="icon"
          />
          <span style={styles.labelMainVal}>{currentProgrammLabel}</span>
        </div>
        <div className="side-menu-item-holder">
          {/* <label style={styles.labelMain}>Language: </label> */}
          <img
            src="/image/globe_language_icon.svg"
            alt="Language Icon"
            className="icon"
          />
          <span style={styles.labelMainLast}>{broadcastLangLabel}</span>
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
            <Row style={styles.row}>
              <Col xs={leftColSize} md={leftColSize}>
                <label style={styles.label}>Chanel:</label>
              </Col>
              <Col xs={rightColSize} md={rightColSize}>
                <DropdownButtonDef
                  id="brodcast_programm"
                  data={brodcastProgrammArr}
                  currentValue={currentProgrammItem}
                  setDataRef={updateBroadcastProgramm}
                  style={styles.dropDown}
                  variant="light"
                ></DropdownButtonDef>
              </Col>
            </Row>
            <Row style={styles.row}>
              <Col xs={leftColSize} md={leftColSize}>
                <label style={styles.label}>Language:</label>
                <i
                  className="bi bi-exclamation-circle"
                  style={styles.icon}
                  title="The subtitle language is defined by user's role. Please ask admin to change it."
                ></i>
              </Col>
              <Col xs={rightColSize} md={rightColSize}>
                <DropdownButtonDef
                  id="brodcast_lang"
                  data={broadcastLanguages}
                  currentValue={currentLangItem}
                  setDataRef={updateBroadcastLang}
                  style={styles.dropDown}
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
