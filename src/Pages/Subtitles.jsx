import React, { useEffect, useState } from "react";
import UserService from "../Services/KeycloakServices";
import "./PagesCSS/Subtitle.css";
import { useDispatch, useSelector } from "react-redux";
import {
  GetSubtitleData,
  getAllBookAddedByUser,
} from "../Redux/Subtitle/SubtitleSlice";
import BookContent from "../Components/BookContent";
import {
  UnBookmarkSlide,
  UserBookmarkList,
  getAllBookmarkList,
} from "../Redux/ArchiveTab/ArchiveSlice";

const Subtitles = () => {
  const dispatch = useDispatch();
  const UserAddedList = useSelector(getAllBookAddedByUser);
  const GetAllBookmarkList = useSelector(getAllBookmarkList);
  const [isLtr, setIsLtr] = useState(true);
  const [activatedTab, setActivatedTab] = useState("");

  useEffect(() => {
    dispatch(GetSubtitleData());
    dispatch(UserBookmarkList());
  }, []);

  //This useEffect will get all fileid from local storage and make api call
  useEffect(() => {
    const fileId = JSON.parse(localStorage.getItem("fileids"));
    console.log(fileId, "uuuuuuuuuuu");
    // for (let index = 0; index < fileId.length; index++) {
    //   const element = fileId[index];
    //   ///Pass file id and get all data
    // }
  }, []);
  console.log(UserAddedList);

  return (
    <>
      <div className="body-content d-flex ">
        <div className="left-section">
          <div className="innerhead d-flex justify-content-between">
            <div
              className="btn-group"
              role="group"
              aria-label="Basic mixed styles example"
            >
              <button type="button" className="btn btn-success">
                Subtitels
              </button>

              <button type="button" className="btn btn-tr">
                Questions
              </button>
            </div>
            <div className="right-sec">
              <div
                className="btn-group"
                role="group"
                aria-label="Basic mixed styles example"
              >
                <div className="input-box">
                  <label className="w-100">Slide</label>
                  <input
                    className=""
                    type="text"
                    placeholder="Search"
                    aria-label="Search"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsLtr(!isLtr)}
                  className="btn btn-tr"
                >
                  {isLtr ? "LTR" : "RTL"}
                </button>

                <button type="button" className="btn btn-tr">
                  <img src="image/Vector.svg" />
                </button>
              </div>
            </div>
          </div>

          <div className="tab-sec">
            <div className="top-tab">
              <ul className="nav nav-tabs " id="myTab" role="tablist">
                {/* List of All Book that user have added */}
                {UserAddedList?.map((key, index) => (
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link  ${
                        key?.book_title == activatedTab
                          ? "active"
                          : activatedTab == "" && index == 0
                          ? "active"
                          : ""
                      } `}
                      id="home-tab"
                      onClick={() => {
                        setActivatedTab(key?.book_title);
                      }}
                    >
                      {key?.book_title}
                    </button>
                    <i
                      className="bi bi-x"
                      onChange={() => {
                        dispatch();
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="tab-content overflow-y-auto">
              {/* Here according to book that user select  data will get display  */}

              <div
                className="tab-pane active"
                id="home"
                role="tabpanel"
                aria-labelledby="home-tab"
                tabindex="0"
              >
                <div>
                  <div
                    className={`box-content ${
                      isLtr ? "ChangeToLtr" : "ChangeToRtl"
                    }`}
                  >
                    hbdffdbfdbhhfbdbhdfbhfbhjbh
                  </div>
                  {UserAddedList?.map(
                    (item, index) =>
                      activatedTab == "" &&
                      index == 0 && (
                        <BookContent
                          isLtr={isLtr}
                          key={index}
                          bookTitle={item?.book_title}
                          lastActivated={item.last_activated}
                          contents={item?.contents}
                        />
                      )
                  )}
                </div>
                <div>
                  <div
                    className={`box-content ${
                      isLtr ? "ChangeToLtr" : "ChangeToRtl"
                    }`}
                  >
                    sdbcdsfbujb
                  </div>
                  <div
                    className={`box-content ${
                      isLtr ? "ChangeToLtr" : "ChangeToRtl"
                    }`}
                  >
                    sdbcdsfbujbadsd333333333
                  </div>
                  {UserAddedList?.map(
                    (item, index) =>
                      activatedTab == item?.book_title && (
                        <BookContent
                          isLtr={isLtr}
                          key={index}
                          bookTitle={item?.book_title}
                          lastActivated={item.last_activated}
                          contents={item?.contents}
                        />
                      )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="right-section">
          <div className="first-sec">
            <div className="video">
              <div className="ratio ratio-16x9">
                <iframe
                  src="https://www.youtube.com/embed/zpOULjyy-n8?rel=0"
                  title="YouTube video"
                  allowfullscreen
                ></iframe>
              </div>
            </div>
            <div className="box">
              זאת אומרת, שאם הקב"ה יתן לו זה, שתהיה לו היכולת לבטל את רשותו
              ולהיבטל לרשותו של הקב"ה, שהוא רוצה, שתהיה רק רשות היחיד בעולם,
              היינו רשותו של הקב"ה, שזו כל ישועתו, זה נקרא שיש לו כלי וצורך
              שהקב"ה יעזור לו.
            </div>
          </div>
          <div className="book-mark whit-s">
            <div className="top-head">
              <h3>Bookmarks</h3>
            </div>
            <div className="">
              {GetAllBookmarkList?.map((key) => {
                return (
                  <div className="d-flex justify-content-between">
                    <i
                      onClick={() =>
                        dispatch(
                          UnBookmarkSlide(key.split("/").at(-1).trim(""))
                        )
                      }
                      className="bi bi-trash"
                    />
                    <a
                      className="text-truncate mx-3"
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      title={key}
                    >
                      {key}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="Questions whit-s">
            <div className="top-head d-flex justify-content-between">
              <h3>Questions</h3>
              <div className="input-box">
                <input
                  className=""
                  type="text"
                  placeholder="Search"
                  aria-label="Search"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Subtitles;
