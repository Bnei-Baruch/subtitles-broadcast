import React, { useEffect, useState } from "react";
import "./PagesCSS/Subtitle.css";
import { useDispatch } from "react-redux";
import { getAllBookAddedByUser } from "../Redux/Subtitle/SubtitleSlice";
import BookContent from "../Components/BookContent";
import {
  BookmarksSlide,
  UserBookmarkList,
  getAllBookmarkList,
  BookmarkSlide,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useSelector } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DraggableItem from "../Components/DraggableItem";
import GreenWindowButton from "../Components/GreenWindowButton";
import ActiveSlideMessaging from "../Components/ActiveSlideMessaging"
import BroadcastSettings from "../Components/BroadcastSettings"

const brodcastProgrammArr = [{ value: "morning_lesson", label: "Morning lesson" },
{ value: "brodcast_1", label: "Brodcast 1" }, { value: "brodcast_2", label: "Brodcast 2" },
{ value: "brodcast_3", label: "Brodcast 3" }];
const broadcastLangArr = [{ value: "he", label: "Hebrew" }, { value: "ru", label: "Russian" },
{ value: "en", label: "English" }, { value: "es", label: "Spanish" }];
const broadcastLangMapObj = {
  he: broadcastLangArr[0], ru: broadcastLangArr[1],
  en: broadcastLangArr[2], es: broadcastLangArr[3]
};

const Subtitles = () => {
  const bcLanglocalStorageVal = localStorage.getItem("broadcastLanguage");
  const [broadcastProgramm, setBroadcastProgramm] = useState(brodcastProgrammArr[0]);
  const [broadcastLang, setBroadcastLang] = useState(() => {
    const bcLangObj = broadcastLangMapObj[bcLanglocalStorageVal] ?
      broadcastLangMapObj[bcLanglocalStorageVal] : broadcastLangArr[0];
    return bcLangObj;
  });
  const [mqttMessage, setMqttMessage] = useState(null);
  const [jobMqttMessage, setJobMqttMessage] = useState(null);
  const [showGreenWindow, setShowGreenWindow] = useState(false);
  const [showBroadcastSettings, setShowBroadcastSettings] = useState(() => {
    return sessionStorage.getItem("isBroadcastSettingsShown") === "true" ? false : true;
  });

  const dispatch = useDispatch();
  const activatedTabData = +localStorage.getItem("activeSlideFileUid");
  const UserAddedList = useSelector(getAllBookAddedByUser);
  const GetAllBookmarkList = useSelector(getAllBookmarkList);
  const [items, setItems] = useState([]);
  const [isLtr, setIsLtr] = useState(true);
  const [activatedTab, setActivatedTab] = useState(activatedTabData);

  const handleKeyPress = (event) => {
    if (event.key === "n" || event.keyCode === 78) {
      localStorage.setItem(
        "activeSlideFileUid",
        +localStorage.getItem("activeSlideFileUid") + 1
      );

      setActivatedTab(localStorage.getItem("activeSlideFileUid"));
    }
    if (event.key === "b" || event.keyCode === 66) {
      localStorage.setItem(
        "activeSlideFileUid",
        +localStorage.getItem("activeSlideFileUid") - 1
      );
      setActivatedTab(localStorage.getItem("activeSlideFileUid"));
    }
  };

  useEffect(() => {
    // Add event listener when the component mounts
    window.addEventListener("keydown", handleKeyPress);

    // Remove event listener when the component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);
  useEffect(() => {
    dispatch(UserBookmarkList());
  }, [dispatch]);
  useEffect(() => { }, [+localStorage.getItem("activeSlideFileUid")]);
  //This useEffect will get all fileid from local storage and make api call
  useEffect(() => {
    GetAllBookmarkList?.length > 0 && setItems(GetAllBookmarkList);
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
    dispatch(BookmarksSlide(updatedItems));

    setItems(updatedItems);
  };

  return (
    <>
      <div className="body-content d-flex ">
        <div className="left-section row">
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
              </div>
              <BroadcastSettings
                showBroadcastSettings={showBroadcastSettings}
                setShowBroadcastSettings={setShowBroadcastSettings}
                broadcastProgramm={broadcastProgramm}
                setBroadcastProgramm={setBroadcastProgramm}
                broadcastLang={broadcastLang}
                setBroadcastLang={setBroadcastLang}
                brodcastProgrammArr={brodcastProgrammArr}
                broadcastLangArr={broadcastLangArr}
              >
              </BroadcastSettings>
              <ActiveSlideMessaging
                broadcastProgrammCode={broadcastProgramm.value}
                broadcastLangCode={broadcastLang.value}
                userAddedList={UserAddedList}
                activatedTab={activatedTab}
                setActivatedTab={setActivatedTab}
                mqttMessage={mqttMessage}
                setMqttMessage={setMqttMessage}
                jobMqttMessage={jobMqttMessage}
                setJobMqttMessage={setJobMqttMessage}
              />
              <GreenWindowButton
                showGreenWindow={showGreenWindow}
                setShowGreenWindow={setShowGreenWindow}
                isLtr={isLtr}
                mqttMessage={mqttMessage}
              />
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

              {/* <Dropdown variant="success" id="brodcast_programm">
                  <Dropdown.Toggle id="dropdown-autoclose-outside">
                    Brodcasting programm
                  </Dropdown.Toggle>

                  <Dropdown.Menu>
                    <Dropdown.Item value='morning_lesson' >Morning lesson</Dropdown.Item>
                    <Dropdown.Item value='brodcast_1'>Brodcast 1</Dropdown.Item>
                    <Dropdown.Item value='brodcast_2'>Brodcast 3</Dropdown.Item>
                    <Dropdown.Item value='brodcast_3'>Brodcast 3</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown> */}

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
                    setActivatedTab={setActivatedTab}
                    activatedTab={activatedTab}
                    targetItemId={activatedTab}
                    contents={UserAddedList}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <i
              className={`bi bi-chevron-left me-1 cursor-pointer ${activatedTab <= 1 ? "disablecolor" : "custom-pagination"
                }`}
              onClick={() => {
                const file_uid = UserAddedList?.slides?.[0]?.file_uid;
                const activeSlide = JSON.parse(
                  localStorage.getItem("activeSlideFileUid")
                );
                const SlideOrderID = activeSlide?.find(
                  (key) => key?.fileUid == file_uid
                );
                const slideID = UserAddedList?.slides?.find(
                  (key) => key?.order_number == +SlideOrderID?.activeSlide
                );

                dispatch(
                  BookmarkSlide({
                    file_uid: file_uid,
                    slide_id: slideID?.ID,
                    update: true,
                    order: SlideOrderID?.activeSlide,
                  })
                );

                const newData = activeSlide.map((key) =>
                  key.fileUid === file_uid
                    ? {
                      fileUid: file_uid,
                      activeSlide: +key.activeSlide - 1,
                    }
                    : key
                );
                localStorage.setItem(
                  "activeSlideFileUid",
                  JSON.stringify(newData)
                );
                setActivatedTab(+activatedTab - 1);
              }}
            >
              Back{" "}
            </i>

            <input
              className="no-border text-center"
              defaultValue={activatedTab}
              value={activatedTab}
              onWheel={(e) => e.target.blur()}
              type="number" // Set the input type to "number" to enforce numeric input
              onChange={(e) => {
                const inputValue = +e.target.value;
                const maxSlideIndex = +UserAddedList?.slides?.length;
                if (inputValue > 0 && inputValue <= maxSlideIndex) {
                  localStorage.setItem("activeSlideFileUid", inputValue);
                  setActivatedTab(inputValue);
                } else if (inputValue > maxSlideIndex) {
                  // Handle the case when inputValue is greater than maxSlideIndex
                  localStorage.setItem("activeSlideFileUid", maxSlideIndex + 1);
                  setActivatedTab(maxSlideIndex + 1);
                } else {
                  localStorage.setItem("activeSlideFileUid", 1);
                  setActivatedTab("");
                }
              }}
              placeholder="slide_ID"
            />
            <span
              onClick={() => {
                const file_uid = UserAddedList?.slides?.[0]?.file_uid;
                const activeSlide = JSON.parse(
                  localStorage.getItem("activeSlideFileUid")
                );
                const SlideOrderID = activeSlide?.find(
                  (key) => key?.fileUid == file_uid
                );

                const slideID = UserAddedList?.slides?.find(
                  (key) => key?.order_number == +SlideOrderID?.activeSlide
                );

                dispatch(
                  BookmarkSlide({
                    file_uid: file_uid,
                    slide_id: slideID?.ID,
                    update: true,
                    order: SlideOrderID?.activeSlide,
                  })
                );
                const newData = activeSlide.map((key) =>
                  key.fileUid === file_uid
                    ? {
                      fileUid: file_uid,
                      activeSlide: +key.activeSlide + 1,
                    }
                    : key
                );
                localStorage.setItem(
                  "activeSlideFileUid",
                  JSON.stringify(newData)
                );
                setActivatedTab(+activatedTab + 1);
              }}
              className={` cursor-pointer ${false ? "disablecolor" : "custom-pagination"
                }`}
            >
              Next{" "}
              <i
                className={`bi bi-chevron-right  cursor-pointer  ${false ? "disablecolor" : "custom-pagination"
                  }`}
              />
            </span>
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
                  items?.map((item, index) => (
                    <DraggableItem
                      key={item.id}
                      id={item.id}
                      setActivatedTab={setActivatedTab}
                      bookmarkDelete={item.bookmark_id}
                      text={item?.bookmark_path}
                      slideID={item?.slide_id}
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
