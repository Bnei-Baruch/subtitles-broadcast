import React from "react";

const BookContent = ({ bookTitle, lastActivated, contents, isLtr }) => {
  console.log("iiiiiiiiiiiiii", contents);
  return (
    <>
      {contents.map((item, index) => (
        <div className={`box-content ${isLtr ? "ChangeToLtr" : "ChangeToRtl"}`}>
          {item}{" "}
        </div>
      ))}
    </>
  );
};

export default BookContent;
