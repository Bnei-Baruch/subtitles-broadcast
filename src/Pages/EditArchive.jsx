import React from "react";

const EditArcive = () => {
  return (
    <div className="archiveBackground bg-light Edit">
      <div className="card border-0">
        <div className="top-row d-flex justify-content-between align-items-center mb-4">
          <h3 className="m-0">Edit Subtitle</h3>
          <div className="form-sec position-relative">
            <input
              className="form-control input"
              type="search"
              placeholder="Search in the article..."
              aria-label="Search"
            />
            <button
              type="button"
              className="btn btn-tr position-absolute end-0 top-0  mt-1"
            >
              {" "}
              <img alt="vector" width="22px" src="image/Vector.svg" />
            </button>
          </div>
        </div>
        <div className="innerhead d-flex justify-content-between align-items-end mb-5">
          <div className="input-box first">
            <label className="w-100">Title</label>
            <input
              className=""
              type="text"
              placeholder="נכנסים להיכל המלך"
              aria-label="Search"
            />
          </div>
          <div className="input-box sec">
            <label className="w-100">Author</label>
            <select className="select-new" aria-label="Default select example">
              <option selected>Open this select menu</option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>
          <div className="input-box sec">
            <label className="w-100">Language</label>
            <select className="select-new" aria-label="Default select example">
              <option selected>Open this select menu</option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </select>
          </div>

          <div className="button-box group-new">
            <button type="button" className="btn cancel">
              Cancel
            </button>
            <button type="button" className="btn save ">
              Save
            </button>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="row">
          <div className="col-md-6">
            <h4>Edit view</h4>
            <h6>Selected</h6>
            <div className="box box2 selected">%H נכנסים להיכל המלך %break</div>
          </div>
          <div className="col-md-6">
            <h4>Read-only view</h4>
            <h6>&nbsp;</h6>
            <div className="box box2">%H נכנסים להיכל המלך %break</div>
          </div>
        </div>
        <button type="button" className="btn btn-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <g clip-path="url(#clip0_1767_4844)">
              <path
                d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"
                fill="#6D6D6D"
              />
            </g>
            <defs>
              <clipPath id="clip0_1767_4844">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg>
          Add new slide
        </button>
        <h2>next</h2>
        <div className="row">
          <div className="col-md-6">
            <div className="box">
              לכן ע"י השתוות הצורה, כמו שאמרו חז"ל, על הדבק במדותיו "מהו רחום אף
              אתה רחום", ובזה האדם נכנס בהיכל המלך, וזוכה כל פעם לדבר עם המלך.
              %S (הרב"ש. מאמר 21 "מהו, ענין טהרת אפר פרה, בעבודה" 1991) %break
            </div>
            <div className="box">
              לכן ע"י השתוות הצורה, כמו שאמרו חז"ל, על הדבק במדותיו "מהו רחום אף
              אתה רחום", ובזה האדם נכנס בהיכל המלך, וזוכה כל פעם לדבר עם המלך.
              %S (הרב"ש. מאמר 21 "מהו, ענין טהרת אפר פרה, בעבודה" 1991) %break
            </div>
            <div className="box">
              לכן ע"י השתוות הצורה, כמו שאמרו חז"ל, על הדבק במדותיו "מהו רחום אף
              אתה רחום", ובזה האדם נכנס בהיכל המלך, וזוכה כל פעם לדבר עם המלך.
              %S (הרב"ש. מאמר 21 "מהו, ענין טהרת אפר פרה, בעבודה" 1991) %break
            </div>
          </div>
          <div className="col-md-6">
            <div className="box">
              לכן ע"י השתוות הצורה, כמו שאמרו חז"ל, על הדבק במדותיו "מהו רחום אף
              אתה רחום", ובזה האדם נכנס בהיכל המלך, וזוכה כל פעם לדבר עם המלך.
              %S (הרב"ש. מאמר 21 "מהו, ענין טהרת אפר פרה, בעבודה" 1991) %break
            </div>
            <div className="box">
              לכן ע"י השתוות הצורה, כמו שאמרו חז"ל, על הדבק במדותיו "מהו רחום אף
              אתה רחום", ובזה האדם נכנס בהיכל המלך, וזוכה כל פעם לדבר עם המלך.
              %S (הרב"ש. מאמר 21 "מהו, ענין טהרת אפר פרה, בעבודה" 1991) %break
            </div>
            <div className="box">
              לכן ע"י השתוות הצורה, כמו שאמרו חז"ל, על הדבק במדותיו "מהו רחום אף
              אתה רחום", ובזה האדם נכנס בהיכל המלך, וזוכה כל פעם לדבר עם המלך.
              %S (הרב"ש. מאמר 21 "מהו, ענין טהרת אפר פרה, בעבודה" 1991) %break
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditArcive;
