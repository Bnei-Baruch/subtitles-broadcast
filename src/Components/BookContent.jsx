import React from "react";

const BookContent = ({ bookTitle, lastActivated, contents, isLtr }) => {
  return (
    <>
      <div className={`box-content ${isLtr ? "ChangeToLtr" : "ChangeToRtl"}`}>
        sgdgsfjhvshjsvhshvjsfhjvdfvhdfskhjdsfhbjv
      </div>
      {contents.map((item, index) => (
        <div className={`box-content ${isLtr ? "ChangeToLtr" : "ChangeToRtl"}`}>
          {item}{" "}
        </div>
      ))}
    </>
  );
};

export default BookContent;
