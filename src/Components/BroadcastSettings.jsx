import React, { createContext, useContext, useState } from "react";
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
    position: "fixed",
    top: "18px",
    right: "160px",
    width: "370px",
    textAlign: "left",
    backgroundColor: "transparent",
    transition: "none",
    border: "none",
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
const broadcastLangMapObj = {
  he: broadcastLangArr[0],
  ru: broadcastLangArr[1],
  en: broadcastLangArr[2],
  es: broadcastLangArr[3],
};

broadcastLangArr.forEach((broadcastLangObj) => {
  broadcastLangMapObj[broadcastLangObj.value] = broadcastLangObj;
});

export function BroadcastSettings({
  showBroadcastSettings,
  setShowBroadcastSettings,
}) {
  const appContextlData = useContext(AppContext);

  const bcLanglocalStorageVal = localStorage.getItem("broadcastLanguage");

  const [broadcastProgramm, setBroadcastProgramm] = useState(
    brodcastProgrammArr[0]
  );
  appContextlData.setBroadcastProgramm(brodcastProgrammArr[0]);

  const [broadcastLang, setBroadcastLang] = useState(() => {
    const bcLangObj = broadcastLangMapObj[bcLanglocalStorageVal]
      ? broadcastLangMapObj[bcLanglocalStorageVal]
      : broadcastLangArr[0];
    return bcLangObj;
  });
  appContextlData.setBroadcastLang(broadcastLang);

  const handleClose = () => {
    sessionStorage.setItem("isBroadcastSettingsShown", true);
    setShowBroadcastSettings(false);
  };
  const handleShow = () => setShowBroadcastSettings(true);

  function setProgram(itemObj) {
    setBroadcastProgramm(itemObj);
    appContextlData.setBroadcastProgramm(itemObj);
  }

  function setLang(itemObj) {
    setBroadcastLang(itemObj);
    appContextlData.setBroadcastLang(itemObj);
  }

  return (
    <>
      <Button variant="light" onClick={handleShow} style={styles.buttonPrimary}>
        <label style={styles.labelMain}>Chanel: </label>
        <span style={styles.labelMainVal}>{broadcastProgramm.label}</span>

        <label style={styles.labelMain}>Language: </label>
        <span style={styles.labelMainLast}>{broadcastLang.label}</span>
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
                  currentValue={broadcastProgramm}
                  setDataRef={setProgram}
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
                  currentValue={broadcastLang}
                  setDataRef={setLang}
                  style={styles.dropDown}
                  variant="light"
                  disabled={true}
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
