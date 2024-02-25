import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import DropdownButtonDef from "../Components/DropdownButtonDef"

const leftColSize = 3;
const rightColSize = 8;

const styles = {
    buttonPrimary: {
        position: "fixed",
        top: "13px",
        right: "160px",
        width: "370px",
        textAlign: "left"
    },
    row: {
        height: "50px"
    },
    label: {
        marginTop: "6px"
    },
    dropDown: {
        width: "160px",
        border: "1px solid grey"
    },
    icon: {
        marginLeft: "3px"
    },
    labelMain: {
        marginRight: "3px"
    },
    labelMainVal: {
        marginRight: "25px",
        fontWeight: "bold",
        fontSize: "16px",
    },
    labelMainLast: {
        fontWeight: "bold",
        fontSize: "16px"
    }
};

export function BroadcastSettings({
    showBroadcastSettings,
    setShowBroadcastSettings,
    broadcastProgramm,
    setBroadcastProgramm,
    broadcastLang,
    setBroadcastLang,
    brodcastProgrammArr,
    broadcastLangArr
}) {

    const handleClose = () => {
        sessionStorage.setItem("isBroadcastSettingsShown", true);
        setShowBroadcastSettings(false);
    }
    const handleShow = () => setShowBroadcastSettings(true);

    return (
        <>
            <Button variant="light" onClick={handleShow} style={styles.buttonPrimary}>
                <label style={styles.labelMain}>Chanel: </label>
                <span style={styles.labelMainVal}>{broadcastProgramm.label}</span>

                <label style={styles.labelMain}>Language: </label>
                <span style={styles.labelMainLast}>{broadcastLang.label}</span>
            </Button>

            <Modal show={showBroadcastSettings} onHide={handleClose}>
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
                                    id="brodcast_programm" data={brodcastProgrammArr}
                                    currentValue={broadcastProgramm} setDataRef={setBroadcastProgramm}
                                    style={styles.dropDown} variant="light">
                                </DropdownButtonDef>
                            </Col>
                        </Row>
                        <Row style={styles.row}>
                            <Col xs={leftColSize} md={leftColSize}>
                                <label style={styles.label}>Language:</label>
                                <i className="bi bi-exclamation-circle"
                                    style={styles.icon}
                                    title="The subtitle language is defined by user's role. Please ask admin to change it."
                                ></i>
                            </Col>
                            <Col xs={rightColSize} md={rightColSize}>
                                <DropdownButtonDef
                                    id="brodcast_lang" data={broadcastLangArr} currentValue={broadcastLang}
                                    setDataRef={setBroadcastLang}
                                    style={styles.dropDown} variant="light"
                                    disabled={true}
                                >
                                </DropdownButtonDef>
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

export default BroadcastSettings