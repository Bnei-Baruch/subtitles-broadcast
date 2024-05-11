import React, { useContext, useEffect, useState } from "react";
import "./PagesCSS/Subtitle.css";
import { useDispatch } from "react-redux";
import {
  getAllBookAddedByUser,
  clearAllBookmarks
} from "../Redux/Subtitle/SubtitleSlice";
import BookContent from "../Components/BookContent";
import {
  BookmarksSlide,
  UserBookmarkList,
  getAllBookmarkList,
  BookmarkSlide
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
import {
  broadcastLanguages,
} from "../Utils/Const";
import { getCurrentBroadcastLanguage } from "../Utils/Common";
import AppContext from "../AppContext";
import GetLangaugeCode from "../Utils/Const";

const Subtitles = () => {
  const appContextlData = useContext(AppContext);
  const [isSubTitleMode, setIsSubTitleMode] = useState(true);
  const btnSubtitelsRef = React.createRef();
  const btnQuestionsRef = React.createRef();
  const dispatch = useDispatch();
  const activatedTabData = +localStorage.getItem("activeSlideFileUid");
  const UserAddedList = useSelector(getAllBookAddedByUser);
  const GetAllBookmarkList = useSelector(getAllBookmarkList);
  const [searchSlide, setSearchSlide] = useState("");
  const [items, setItems] = useState([]);
  const [isLtr, setIsLtr] = useState(true);
  const [activatedTab, setActivatedTab] = useState(activatedTabData);
  const languages = GetLangaugeCode();

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
    dispatch(UserBookmarkList({ language: appContextlData.broadcastLang.label }));
    dispatch(clearAllBookmarks());
  }, [dispatch, appContextlData.broadcastLang.label]);
  // useEffect(() => { }, [+localStorage.getItem("activeSlideFileUid")]);
  //This useEffect will get all fileid from local storage and make api call
  useEffect(() => {
    setItems(GetAllBookmarkList);
  }, [GetAllBookmarkList]);
  useEffect(() => {
    if (searchSlide.length) {
      const file_uid = localStorage.getItem("fileUid");
      file_uid && dispatch(GetSubtitleData({ file_uid, keyword: searchSlide }));
      localStorage.setItem("fileUid", "");
    }
  }, [searchSlide]);

  const moveCard = (fromIndex, toIndex) => {
    const updatedItems = [...items];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);
    dispatch(BookmarksSlide(updatedItems));

    setItems(updatedItems);
  };

  function questionsBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnSubtitelsRef.current.classList.remove("btn-success");

    setIsSubTitleMode(false);
  }

  function subtitelsBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnQuestionsRef.current.classList.remove("btn-success");

    setIsSubTitleMode(true);
  }

  return (
    <>
      <div className="body-content d-flex ">
        <div className="left-section row">
          <div className="innerhead d-flex justify-content-between subtitle-header">
            <input
              className="no-border-search mx-3 subtitle-search"
              value={searchSlide}
              placeholder="search"
              onChange={(e) => setSearchSlide(e.target.value)}
            />
            <div
              className="btn-group"
              role="group"
              aria-label="Basic mixed styles example"
            >
              <button
                ref={btnSubtitelsRef}
                id="btnSubtitels"
                type="button"
                className={isSubTitleMode ? "btn btn-success" : "btn"}
                onClick={(evt) => subtitelsBtnOnClick(evt)}
              >
                Subtitels
              </button>
              <button
                ref={btnQuestionsRef}
                id="btnQuestions"
                type="button"
                className={isSubTitleMode ? "btn" : "btn btn-success"}
                onClick={(evt) => questionsBtnOnClick(evt)}
              >
                Questions
              </button>
            </div>
            <div className="right-sec">
              <div
                className="btn-group"
                role="group"
                aria-label="Basic mixed styles example"
              ></div>
              <GreenWindowButton
                isSubTitleMode={isSubTitleMode}
                isLtr={isLtr}
              />
              <button
                type="button"
                onClick={() => setIsLtr(!isLtr)}
                className="btn btn-tr"
              >
                {isLtr ? "LTR" : "RTL"}
              </button>
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
                <div id="bookContentCont" className="slides-set">
                  <BookContent
                    isLtr={isLtr}
                    setSearchSlide={setSearchSlide}
                    setActivatedTab={setActivatedTab}
                    activatedTab={activatedTab}
                    targetItemId={activatedTab}
                    contents={UserAddedList}
                    searchKeyword={searchSlide}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-center align-items-center mt-2 paginationStyle">
            <i
              className={`bi bi-chevron-left me-1 cursor-pointer ${activatedTab <= 1 ? "disablecolor" : "custom-pagination"
                }`}
              onClick={() => {
                if (activatedTab > 0) {
                  const file_uid = UserAddedList?.slides?.[0]?.file_uid;
                  const slideID = UserAddedList?.slides?.find(
                    (key) => key?.order_number == +activatedTab - 1
                  );
                  let targetBookmarkSlideID = slideID.ID;
                  slideID?.languages.forEach((item, index) => {
                    if (item === languages[appContextlData.broadcastLang.label]) {
                      targetBookmarkSlideID += index;
                    }
                  });
                  dispatch(
                    BookmarkSlide({
                      data: {
                        file_uid: file_uid,
                        slide_id: targetBookmarkSlideID,
                        update: true
                      },
                      language: appContextlData.broadcastLang.label
                    })
                  );
                  setActivatedTab(+activatedTab - 1);
                }
              }}
            >
              Back
            </i>
            <div className="custom-select-container">
              <Select
                menuPlacement="top"
                id="numberSelector"
                className="custom-select"
                styles={{
                  control: (provided, state) => ({
                    ...provided,
                    boxShadow: "none", // Remove box shadow
                    border: "none", // Remove border
                    backgroundColor: "transparent", // Set background color to transparent
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
                value={
                  isNaN(+UserAddedList?.slides?.at(-1)?.["order_number"])
                    ? { value: "/", label: "- / -" }
                    : {
                      value: `${activatedTab}/${+UserAddedList?.slides?.at(-1)?.["order_number"] + 1
                        }`,
                      label: `${activatedTab + 1}/${+UserAddedList?.slides?.at(-1)?.["order_number"] + 1
                        }`,
                    }
                }
                onChange={handleChange}
                options={[
                  ...Array(
                    UserAddedList?.slides?.at(-1)?.["order_number"]
                  )?.keys(),
                  UserAddedList?.slides?.at(-1)?.["order_number"],
                ]?.map((index) => ({
                  label: index + 1,
                  value: `${index + 1}/${+UserAddedList?.slides?.at(-1)?.["order_number"] + 1
                    }`,
                }))}
              />
              <div className="underline"></div>
            </div>
            <span
              onClick={() => {
                if (
                  UserAddedList?.slides?.at(-1)?.["order_number"] >
                  +activatedTab
                ) {
                  const file_uid = UserAddedList?.slides?.[0]?.file_uid;
                  const slideID = UserAddedList?.slides?.find(
                    (key) => key?.order_number == +activatedTab + 1
                  );
                  let targetBookmarkSlideID = slideID.ID;
                  slideID?.languages.forEach((item, index) => {
                    if (item === languages[appContextlData.broadcastLang.label]) {
                      targetBookmarkSlideID += index;
                    }
                  });
                  if (UserAddedList?.slides[UserAddedList?.slides?.length - 1].ID >= targetBookmarkSlideID) {
                    dispatch(
                      BookmarkSlide({
                        data: {
                          file_uid: file_uid,
                          slide_id: targetBookmarkSlideID,
                          update: true
                        },
                        language: appContextlData.broadcastLang.label
                      })
                    );
                    setActivatedTab(+activatedTab + 1);
                  }
                }
              }}
              className={` cursor-pointer ${UserAddedList?.slides?.at(-1)?.["order_number"] < activatedTab
                ? "disablecolor"
                : "custom-pagination"
                }`}
            >
              Next{" "}
              <i
                className={`bi bi-chevron-right  cursor-pointer  ${UserAddedList?.slides?.at(-1)?.["order_number"] < activatedTab
                  ? "disablecolor"
                  : "custom-pagination"
                  }`}
              />
            </span>
          </div>
        </div>

        <div className="right-section">
          <div className="first-sec">
            <ActiveSlideMessaging
              userAddedList={UserAddedList}
              activatedTab={activatedTab}
              setActivatedTab={setActivatedTab}
              isLtr={isLtr}
              isSubTitleMode={isSubTitleMode}
            />
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
                      key={index}
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

          {getCurrentBroadcastLanguage().value === "he" && (
            <div className="Questions whit-s">
              <div className="top-head d-flex justify-content-between">
                <h3>Questions</h3>
              </div>
              <QuestionMessage
                mode="subtitle"
                languagesList={broadcastLanguages}
              ></QuestionMessage>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Subtitles;
