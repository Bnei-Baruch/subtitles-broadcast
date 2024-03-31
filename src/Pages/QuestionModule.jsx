import React, { useState } from "react";
import "./PagesCSS/Questions.css";

const QuestionModule = () => {
  const [handleSuccess, sethandleSuccess] = useState(false);

  return (
    <div className="form-Question">
      <p className="QutionTitle">Workshop question</p>
      <div className="d-flex flex-column  h-auto">
        <div className=" d-flex justify-content-end  p-0">
          <button className="btn btn-light btn-sm ms-3 my-1">clear</button>
          <button
            className="btn btn-primary btn-sm ms-3 my-1"
            onClick={() => sethandleSuccess(true)}
          >
            Send question
          </button>
        </div>
        <div className=" SendQutionTextBox">
          {handleSuccess && (
            <span className="SentToast d-flex justify-content-center align-items-center">
              <i className="bi bi-check-circle text-success p-1" />
              <span className="p-1">Successfully sent</span>
              <i
                onClick={() => sethandleSuccess(false)}
                className="bi bi-x p-1 cursor-pointer"
              />
            </span>
          )}
        </div>
      </div>
      <div className="my-5">
        <p>History</p>

        <div class="SendQutionHistory">
          <ul>
            <li class="item">
              <span class="datetime">Date: 2024-03-21 Time: 10:30 AM</span>
              <br />
              <span class="message">This is the message for Item 1.</span>
            </li>
            <hr />
            <li class="item">
              <span class="datetime">Date: 2024-03-22 Time: 11:45 AM</span>
              <br />
              <span class="message">This is the message for Item 2.</span>
            </li>
            <hr />
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuestionModule;
