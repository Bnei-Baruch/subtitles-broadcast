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
import { GetSubtitleData } from "../Redux/Subtitle/SubtitleSlice";
import { useSelector } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DraggableItem from "../Components/DraggableItem";
import Select from "react-select";
import GreenWindowButton from "../Components/GreenWindowButton";
import ActiveSlideMessaging from "../Components/ActiveSlideMessaging";
import QuestionMessage from "../Components/QuestionMessage";

const Subtitles = () => {
  const [mqttMessage, setMqttMessage] = useState(null);
  const [jobMqttMessage, setJobMqttMessage] = useState(null);

  const dispatch = useDispatch();
  const activatedTabData = +localStorage.getItem("activeSlideFileUid");
  const UserAddedList = useSelector(getAllBookAddedByUser);
  const GetAllBookmarkList = useSelector(getAllBookmarkList);
  const [searchSlide, setSearchSlide] = useState("");
  const [items, setItems] = useState([]);
  const [isLtr, setIsLtr] = useState(true);
  const [activatedTab, setActivatedTab] = useState(activatedTabData);

  const handleChange = (selectedOption) => {
    console.log(selectedOption, "selectedOption");
    const inputValue = +selectedOption?.label - 1;
    const maxSlideIndex = +UserAddedList?.slides?.at(-1)?.["order_number"];
    if (inputValue >= 0 && inputValue <= maxSlideIndex) {
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
  };
  const handleKeyPress = (event) => {
    if (event.key === "n" || event.keyCode === 78) {
      setActivatedTab((pre) => +pre + 1);
      localStorage.setItem("activatedTabData", +activatedTab + 1);
    }
    if (event.key === "b" || event.keyCode === 66) {
      setActivatedTab((pre) => +pre - 1);
      localStorage.setItem("activatedTabData", +activatedTab - 1);
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
  // useEffect(() => { }, [+localStorage.getItem("activeSlideFileUid")]);
  //This useEffect will get all fileid from local storage and make api call
  useEffect(() => {
    GetAllBookmarkList?.length > 0 && setItems(GetAllBookmarkList);
  }, [GetAllBookmarkList]);
  useEffect(() => {
    const file_uid = localStorage.getItem("fileUid");
    file_uid && dispatch(GetSubtitleData({ file_uid, keyword: searchSlide }));
  }, [searchSlide]);

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
            <input
              className="no-border-search mx-3 "
              value={searchSlide}
              placeholder="search"
              onChange={(e) => setSearchSlide(e.target.value)}
            />
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
              ></div>
              <ActiveSlideMessaging
                userAddedList={UserAddedList}
                activatedTab={activatedTab}
                setActivatedTab={setActivatedTab}
                mqttMessage={mqttMessage}
                setMqttMessage={setMqttMessage}
                jobMqttMessage={jobMqttMessage}
                setJobMqttMessage={setJobMqttMessage}
              />
              <GreenWindowButton isLtr={isLtr} mqttMessage={mqttMessage} />
              <button
                type="button"
                onClick={() => setIsLtr(!isLtr)}
                className="btn btn-tr"
              >
                {isLtr ? "LTR" : "RTL"}
              </button>
              {/* <Dropdown variant="success" id="brodcast_programm">
                <Dropdown.Toggle id="dropdown-autoclose-outside">
                  Brodcasting programm
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item value="morning_lesson">
                    Morning lesson
                  </Dropdown.Item>
                  <Dropdown.Item value="brodcast_1">Brodcast 1</Dropdown.Item>
                  <Dropdown.Item value="brodcast_2">Brodcast 3</Dropdown.Item>
                  <Dropdown.Item value="brodcast_3">Brodcast 3</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown> */}
            </div>
          </div>

          <div className="tab-sec">
            <div className="top-tab">
              <ul className="nav nav-tabs " id="myTab" role="tablist"></ul>
            </div>

            <div className="tab-content overflow-y-auto">
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
                    setSearchSlide={setSearchSlide}
                    setActivatedTab={setActivatedTab}
                    activatedTab={activatedTab}
                    targetItemId={activatedTab}
                    contents={UserAddedList}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-center align-items-center mt-2 paginationStyle">
            <i
              className={`bi bi-chevron-left me-1 cursor-pointer ${
                activatedTab <= 1 ? "disablecolor" : "custom-pagination"
              }`}
              onClick={() => {
                if (activatedTab > 1) {
                  const file_uid = UserAddedList?.slides?.[0]?.file_uid;
                  const slideID = UserAddedList?.slides?.find(
                    (key) => key?.order_number == +activatedTab
                  );
                  dispatch(
                    BookmarkSlide({
                      file_uid: file_uid,
                      slide_id: slideID?.ID,
                      update: true,
                    })
                  );
                  setActivatedTab(+activatedTab - 1);
                }
              }}
            >
              Back
            </i>

            <Select
              menuPlacement="top"
              id="numberSelector"
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  boxShadow: "none", // Remove box shadow
                  border: "none", // Remove border
                  backgroundColor: "transparent", // Set background color to transparent
                  textDecoration: "underline",
                }),
                dropdownIndicator: (provided, state) => ({
                  ...provided,
                  display: "none", // Hide dropdown icon
                }),
                menuList: (provided, state) => ({
                  ...provided,
                  textAlign: "center",
                }),
                indicatorSeparator: (provided, state) => ({
                  ...provided,
                  display: "none", // Hide indicator separator
                }),
              }}
              value={{
                value: `${activatedTab}/${
                  UserAddedList?.slides?.at(-1)?.["order_number"]
                }`,
                label: `${activatedTab + 1}/${
                  UserAddedList?.slides?.at(-1)?.["order_number"]
                }`,
              }}
              onChange={handleChange}
              options={[
                ...Array(
                  UserAddedList?.slides?.at(-1)?.["order_number"]
                ).keys(),
              ].map((index) => ({
                label: index + 1,
                value: `${index + 1}/${
                  UserAddedList?.slides?.at(-1)?.["order_number"]
                }`,
              }))}
            />
            <span
              onClick={() => {
                if (
                  UserAddedList?.slides?.at(-1)?.["order_number"] >
                  +activatedTab
                ) {
                  const file_uid = UserAddedList?.slides?.[0]?.file_uid;
                  setActivatedTab(+activatedTab + 1);
                  const slideID = UserAddedList?.slides?.find(
                    (key) => key?.order_number == +activatedTab
                  );
                  dispatch(
                    BookmarkSlide({
                      file_uid: file_uid,
                      slide_id: slideID?.ID,
                      update: true,
                    })
                  );
                }
              }}
              className={` cursor-pointer ${
                UserAddedList?.slides?.at(-1)?.["order_number"] < activatedTab
                  ? "disablecolor"
                  : "custom-pagination"
              }`}
            >
              Next{" "}
              <i
                className={`bi bi-chevron-right  cursor-pointer  ${
                  UserAddedList?.slides?.at(-1)?.["order_number"] < activatedTab
                    ? "disablecolor"
                    : "custom-pagination"
                }`}
              />
            </span>
          </div>
        </div>

        <div className="right-section">
          <div className="first-sec">
            {/* <GreenSlide isLtr={isLtr} mqttMessage={mqttMessage}></GreenSlide> */}
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
            {/* <QuestionMessage
              mode="subtitle"
              languageCode="he"
            ></QuestionMessage>
            <QuestionMessage
              mode="subtitle"
              languageCode="ru"
            ></QuestionMessage>
            <QuestionMessage
              mode="subtitle"
              languageCode="en"
            ></QuestionMessage>
            <QuestionMessage
              mode="subtitle"
              languageCode="es"
            ></QuestionMessage> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default Subtitles;
