import React, { useContext, useState } from "react";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";
import DropdownButtonDef from "../Components/DropdownButtonDef";
import AppContext from "../AppContext";

const leftColSize = 4;
const rightColSize = 8;

const styles = {
  buttonPrimary: {
    width: "370px",
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
    marginRight: "25px",
    fontWeight: "bold",
    fontSize: "16px",
    width: "125px",
    display: "inline-block",
  },
  labelMainLast: {
    fontWeight: "bold",
    fontSize: "16px",
    width: "65px",
    display: "inline-block",
  },
};

const brodcastProgrammArr = [
  { value: "morning_lesson", label: "Morning lesson" },
  { value: "brodcast_1", label: "Brodcast 1" },
  { value: "brodcast_2", label: "Brodcast 2" },
  { value: "brodcast_3", label: "Brodcast 3" },
];

const broadcastLangArr = [
  { value: "he", label: "Hebrew" },
  { value: "ru", label: "Russian" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
];

const broadcastLangMapObj = {};
broadcastLangArr.forEach((broadcastLangObj) => {
  broadcastLangMapObj[broadcastLangObj.value] = broadcastLangObj;
});

export function BroadcastSettings({ props }) {
  const appContextlData = useContext(AppContext);
  const [showBroadcastSettings, setShowBroadcastSettings] = useState(() => {
    return sessionStorage.getItem("isBroadcastSettingsShown") === "true"
      ? false
      : true;
  });

  if (!appContextlData.broadcastProgramm) {
    appContextlData.setBroadcastProgramm(brodcastProgrammArr[0]);
    appContextlData.broadcastProgramm = brodcastProgrammArr[0];
  }

  if (!appContextlData.broadcastLang) {
    const bcLanglocalStorageVal = localStorage.getItem("broadcastLanguage");
    const bcLangObj = broadcastLangMapObj[bcLanglocalStorageVal]
      ? broadcastLangMapObj[bcLanglocalStorageVal]
      : broadcastLangArr[0];

    appContextlData.broadcastLang = bcLangObj.value;
    appContextlData.setBroadcastLang(bcLangObj);
  }

  const handleClose = () => {
    sessionStorage.setItem("isBroadcastSettingsShown", true);
    setShowBroadcastSettings(false);
  };
  const handleShow = () => setShowBroadcastSettings(true);

  return (
    <>
      <Button variant="light" onClick={handleShow} style={styles.buttonPrimary}>
        <label style={styles.labelMain}>Chanel: </label>
        <span style={styles.labelMainVal}>
          {appContextlData.broadcastProgramm.label}
        </span>

        <label style={styles.labelMain}>Language: </label>
        <span style={styles.labelMainLast}>
          {appContextlData.broadcastLang.label}
        </span>
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
                  currentValue={appContextlData.broadcastProgramm}
                  setDataRef={appContextlData.setBroadcastProgramm}
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
                  data={broadcastLangArr}
                  currentValue={appContextlData.broadcastLang}
                  setDataRef={appContextlData.setBroadcastLang}
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
