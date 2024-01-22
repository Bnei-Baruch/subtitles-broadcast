import React from "react";
import { Button, Modal } from "react-bootstrap";

const MessageBox = ({ message, show, handleClose, setFinalConfirm }) => {
  return (
    <>
      <Modal show={show} onHide={handleClose}>
        <div className="modal-header text-center text-danger">
          <div className="icon-box col-12">
            <i className="bi bi-exclamation-circle fs-1"></i>
          </div>
        </div>

        <h2 className="text-center">{message}</h2>

        <div className="modal-footer justify-content-center">
          <Button
            onClick={() => {
              handleClose();
            }}
          >
            No
          </Button>
          <Button
            onClick={() => {
              setFinalConfirm();
              handleClose();
            }}
          >
            Yes
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default MessageBox;
