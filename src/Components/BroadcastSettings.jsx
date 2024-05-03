import React, { useContext, useState, useEffect } from "react";
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
} from "../Utils/Const";
import { getCurrentBroadcastLanguage } from "../Utils/Common";
import AppContext from "../AppContext";

const leftColSize = 4;
const rightColSize = 8;

const styles = {
  buttonPrimary: {
    width: "390px",
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
    fontWeight: "bold",
    fontSize: "16px",
    width: "135px",
    display: "inline-block",
  },
  labelMainLast: {
    fontWeight: "bold",
    fontSize: "16px",
    width: "75px",
    display: "inline-block",
  },
};

export function BroadcastSettings({ props }) {
  const appContextlData = useContext(AppContext);
  const [showBroadcastSettings, setShowBroadcastSettings] = useState(() => {
    return sessionStorage.getItem("isBroadcastSettingsShown") === "true"
      ? false
      : true;
  });

  const [broadcastProgramm, setBroadcastProgramm] = useState(
    brodcastProgrammArr[0]
  );

  const [broadcastLang, setBroadcastLang] = useState(() => {
    return getCurrentBroadcastLanguage();
  });

  const handleClose = () => {
    sessionStorage.setItem("isBroadcastSettingsShown", true);
    setShowBroadcastSettings(false);
    appContextlData.setBroadcastLang(broadcastLang);
  };
  const handleShow = () => setShowBroadcastSettings(true);

  sessionStorage.setItem("broadcastLangObj", JSON.stringify(broadcastLang));
  sessionStorage.setItem(
    "broadcastProgrammObj",
    JSON.stringify(broadcastProgramm)
  );
  if (!appContextlData.broadcastLang) {
    appContextlData.broadcastLang = broadcastLang;
    appContextlData.setBroadcastLang(broadcastLang);
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
                  setDataRef={setBroadcastProgramm}
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
                  currentValue={broadcastLang}
                  setDataRef={setBroadcastLang}
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
