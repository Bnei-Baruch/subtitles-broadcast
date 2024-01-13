import React, { useEffect, useState } from "react";
import "./PagesCSS/Subtitle.css";
import { useDispatch } from "react-redux";
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
import { useSelector } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DraggableItem from "../Components/DraggableItem";

const Subtitles = () => {
  const dispatch = useDispatch();
  const UserAddedList = useSelector(getAllBookAddedByUser);
  const GetAllBookmarkList = useSelector(getAllBookmarkList);
  const [items, setItems] = useState([]);
  const [isLtr, setIsLtr] = useState(true);
  const [activatedTab, setActivatedTab] = useState("");
  console.log(UserAddedList, "UserAddedList");
  useEffect(() => {
    dispatch(UserBookmarkList());
  }, [dispatch]);
  useEffect(() => {}, [+localStorage.getItem("activeSlideFileUid")]);
  //This useEffect will get all fileid from local storage and make api call
  useEffect(() => {
    setItems(GetAllBookmarkList);
    // const fileId = JSON.parse(localStorage.getItem("fileids"));
    // for (let index = 0; index < fileId.length; index++) {
    //   const element = fileId[index];
    //   ///Pass file id and get all data
    // }
  }, [GetAllBookmarkList]);
  const moveCard = (fromIndex, toIndex) => {
    const updatedItems = [...items];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);
    setItems(updatedItems);
  };

  console.log(GetAllBookmarkList, "GetAllBookmarkList");
  return (
    <>
      <div className="body-content d-flex vh-auto">
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
                {/* <div className="input-box">
                  <label className="w-100">Slide</label>
                  <input
                    className=""
                    type="text"
                    placeholder="Search"
                    aria-label="Search"
                  />
                </div> */}
                <button
                  type="button"
                  onClick={() => setIsLtr(!isLtr)}
                  className="btn btn-tr"
                >
                  {isLtr ? "LTR" : "RTL"}
                </button>

                <button type="button" className="btn btn-tr">
                  <img alt="vectors" src="image/Vector.svg" />
                </button>
              </div>
            </div>
          </div>

          <div className="tab-sec">
            <div className="top-tab">
              <ul className="nav nav-tabs " id="myTab" role="tablist">
                {/* List of All Book that user have added */}
                {/* {UserAddedList?.map((key, index) => (
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link  ${
                        key?.book_title === activatedTab
                          ? "active"
                          : activatedTab === "" && index === 0
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
                ))} */}
              </ul>
            </div>

            <div className="tab-content overflow-y-auto">
              {/* Here according to book that user select  data will get display  */}

              <div
                className="tab-pane active"
                id="home"
                role="tabpanel"
                aria-labelledby="home-tab"
                tabIndex="0"
              >
                <div className="vh-80">
                  <BookContent
                    isLtr={isLtr}
                    // bookTitle={item?.slide}
                    // lastActivated={item.slide}
                    targetItemId={activatedTab}
                    contents={UserAddedList}
                  />
                </div>

                {/* <div>
                  {UserAddedList?.map(
                    (item, index) =>
                      activatedTab === item?.book_title && (
                        <BookContent
                          isLtr={isLtr}
                          key={index}
                          bookTitle={item?.book_title}
                          lastActivated={item.last_activated}
                          contents={item?.contents}
                        />
                      )
                  )}
                </div> */}
              </div>
            </div>
            <button
              disabled={+localStorage.getItem("activeSlideFileUid") == 0}
              onClick={() => {
                localStorage.setItem(
                  "activeSlideFileUid",
                  +localStorage.getItem("activeSlideFileUid") - 1
                );
                setActivatedTab(activatedTab - 1);
              }}
            >
              Back
            </button>
            <input
              type="number"
              onChange={(e) => {
                if (+e.target.value > 0) {
                  localStorage.setItem("activeSlideFileUid", +e.target.value);
                  setActivatedTab(+e.target.value);
                  // dispatch(
                  //   GetSubtitleData(localStorage.getItem("activeFileUid"))
                  // );
                } else {
                  localStorage.setItem("activeSlideFileUid", 1);
                  setActivatedTab(1);
                }
              }}
              placeholder="slide_ID"
            />
            <button
              onClick={() => {
                localStorage.setItem(
                  "activeSlideFileUid",
                  +localStorage.getItem("activeSlideFileUid") + 1
                );
                setActivatedTab(activatedTab + 1);
              }}
            >
              Next
            </button>
          </div>
        </div>

        <div className="right-section">
          <div className="first-sec">
            <div className="video">
              <div className="ratio ratio-16x9">
                <iframe
                  src="https://www.youtube.com/embed/zpOULjyy-n8?rel=0"
                  title="YouTube video"
                  allowFullScreen
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
            <DndProvider backend={HTML5Backend}>
              <div className="">
                {items?.length > 0 &&
                  items.map((item, index) => (
                    <DraggableItem
                      key={item.id}
                      id={item.id}
                      setActivatedTab={setActivatedTab}
                      bookmarkDelete={item.bookmark_id}
                      text={item?.bookmark_path}
                      fileUid={item?.file_uid}
                      index={index}
                      moveCard={moveCard}
                    />
                  ))}
              </div>
            </DndProvider>
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
