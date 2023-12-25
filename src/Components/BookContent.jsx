import React from "react";

const BookContent = ({ bookTitle, lastActivated, contents, isLtr }) => {
  return (
    <>
      {contents?.length > 0 &&
        contents.map((item, index) => (
          <div
            className={`box-content ${isLtr ? "ChangeToLtr" : "ChangeToRtl"}`}
          >
            <bdo dir={isLtr ? "ChangeToLtr" : "ChangeToRtl"}>
              {item?.slide}{" "}
            </bdo>
          </div>
        ))}
    </>
  );
};

export default BookContent;
