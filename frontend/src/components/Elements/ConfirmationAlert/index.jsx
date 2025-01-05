import React from "react";
import "./ConfirmAlert.css"; 

const ConfirmAlert = ({ message, onConfirm, onCancel, visible }) => {
  return (
    <div className={`overlay ${visible ? "fade-in" : "fade-out"}`}>
      <div className={`alertBox ${visible ? "slide-in" : "slide-out"}`}>
        <strong>Konfirmasi</strong>
        <p>{message}</p>
        <div className="buttonGroup">
          <button className="confirmButton" onClick={onConfirm}>
            Confirm
          </button>
          <button className="cancelButton" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmAlert;
