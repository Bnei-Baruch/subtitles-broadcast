import React, { useCallback, useEffect, useRef, useState } from "react";
import "./PagesCSS/Subtitle.css";
import { useDispatch } from "react-redux";
import {
  getAllBookAddedByUser,
  clearAllBookmarks,
} from "../Redux/Subtitle/SubtitleSlice";
import BookContent from "../Components/BookContent";
import {
  BookmarksSlide,
  UserBookmarkList,
  getAllBookmarkList,
  getAllBookmarkListLoading,
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
import { useNavigate } from "react-router-dom";
import GetLangaugeCode, {
  MAX_SLIDE_LIMIT,
  DEF_BROADCAST_LANG,
  broadcastLanguages,
} from "../Utils/Const";
import { setSubtitlesDisplayMode } from "../Redux/BroadcastParams/BroadcastParamsSlice";

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const Subtitles = () => {
  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );

  const subtitlesDisplayMode = useSelector(
    (state) => state.BroadcastParams.subtitlesDisplayMode
  );

  const btnSubtitlesRef = React.createRef();
  const btnQuestionsRef = React.createRef();
  const btnNoneRef = React.createRef();
  const dispatch = useDispatch();
  const UserAddedList = useSelector(getAllBookAddedByUser);
  const maxSlideIndex = UserAddedList?.slides?.at(-1)?.["order_number"];
  const allBookmarkList = useSelector(getAllBookmarkList);
  const allBookmarkListLoading = useSelector(getAllBookmarkListLoading);
  const [searchSlide, setSearchSlide] = useState("");
  const previousSearch = usePrevious(searchSlide);
  const [items, setItems] = useState([]);
  const [isLtr, setIsLtr] = useState(true);
  const [selectedSlide, setSelectedSlide] = useState(
    +localStorage.getItem("activeSlideFileUid")
  );
  const languages = GetLangaugeCode();
  const navigate = useNavigate();

  const updateSelectedSlide = (newSelectedSlide) => {
    if (newSelectedSlide < 0) {
      newSelectedSlide = 0;
    } else if (newSelectedSlide > maxSlideIndex) {
      newSelectedSlide = maxSlideIndex;
    }
    const file_uid = UserAddedList?.slides?.[0]?.file_uid;
    const slideID = UserAddedList?.slides?.find(
      (key) => key?.order_number == newSelectedSlide
    );
    const targetBookmarkSlideID =
      slideID.ID +
        slideID?.languages.findIndex(
          (langCode) => langCode === languages[broadcastLangObj.label]
        ) || 0;
    dispatch(
      BookmarkSlide({
        data: {
          file_uid: file_uid,
          slide_id: targetBookmarkSlideID,
          update: true,
        },
        language: broadcastLangObj.label,
      })
    );
    setSelectedSlide(newSelectedSlide);
    localStorage.setItem("activeSlideFileUid", newSelectedSlide);
  };

  const handleChange = (selectedOption) => {
    const inputValue = +selectedOption?.label - 1;
    updateSelectedSlide(inputValue);
  };

  const handleKeyPress = useCallback(
    (event) => {
      if (!UserAddedList.slides || UserAddedList.slides.length === 0) {
        return;
      }

      let currentIndex = UserAddedList.slides.findIndex(
        (slide) => slide.order_number === selectedSlide
      );

      if (currentIndex === -1) {
        console.warn(
          "handleKeyPress: Current slide not found in UserAddedList"
        );
        return;
      }

      let newIndex = currentIndex;

      if (event.keyCode === 40) {
        // Navigate down (next slide by index)
        newIndex = Math.min(currentIndex + 1, UserAddedList.slides.length - 1);
        event.preventDefault();
        event.stopPropagation();
      }

      if (event.keyCode === 38) {
        // Navigate up (previous slide by index)
        newIndex = Math.max(currentIndex - 1, 0);
        event.preventDefault();
        event.stopPropagation();
      }

      if (newIndex !== currentIndex) {
        const newSlide = UserAddedList.slides[newIndex];
        if (newSlide) {
          updateSelectedSlide(newSlide.order_number);
        }
      }
    },
    [UserAddedList, selectedSlide, updateSelectedSlide]
  );

  useEffect(() => {
    // Add event listener when the component mounts
    window.addEventListener("keydown", handleKeyPress);

    // Remove event listener when the component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);
  useEffect(() => {
    if (broadcastLangObj.label) {
      dispatch(UserBookmarkList({ language: broadcastLangObj.label }));
      dispatch(clearAllBookmarks());
    }
  }, [dispatch, broadcastLangObj.label]);
  // useEffect(() => { }, [+localStorage.getItem("activeSlideFileUid")]);
  //This useEffect will get all fileid from local storage and make api call
  useEffect(() => {
    if (!allBookmarkListLoading) {
      setItems(allBookmarkList);
    }
  }, [allBookmarkList, allBookmarkListLoading]);
  useEffect(() => {
    if (searchSlide.length > 0 || searchSlide !== previousSearch) {
      let file_uid = localStorage.getItem("fileUid");
      if (file_uid) {
        dispatch(
          GetSubtitleData({
            file_uid,
            keyword: searchSlide,
            limit: MAX_SLIDE_LIMIT,
          })
        );
        setIsLtr(UserAddedList?.slides[0]?.left_to_right);
      }
    }
  }, [searchSlide, previousSearch]);

  const moveCard = (fromIndex, toIndex) => {
    const updatedItems = [...items];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);
    dispatch(BookmarksSlide(updatedItems));

    setItems(updatedItems);
  };

  function questionsBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnSubtitlesRef.current.classList.remove("btn-success");
    btnNoneRef.current.classList.remove("btn-success");

    dispatch(setSubtitlesDisplayMode("questions"));
  }

  function subtitlesBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnQuestionsRef.current.classList.remove("btn-success");
    btnNoneRef.current.classList.remove("btn-success");

    dispatch(setSubtitlesDisplayMode("sources"));
  }

  function noneBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnSubtitlesRef.current.classList.remove("btn-success");
    btnQuestionsRef.current.classList.remove("btn-success");

    dispatch(setSubtitlesDisplayMode("none"));
  }

  const navigatToEditSubtitle = () => {
    const file_uid = UserAddedList?.slides?.[0]?.file_uid;
    const slide = UserAddedList?.slides?.find(
      (key) => key?.order_number === selectedSlide
    );
    const slideID = slide ? slide.ID : null;
    const editUrl = `/archive/edit?file_uid=${file_uid}&slide_id=${slideID}`;

    navigate(editUrl, {
      state: { previousLocation: window.location.pathname },
    });
  };

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
                ref={btnSubtitlesRef}
                id="btnSubtitles"
                type="button"
                className={`btn sources-mod${
                  subtitlesDisplayMode === "sources"
                    ? " btn-success display-mod-selected"
                    : ""
                }`}
                onClick={(evt) => subtitlesBtnOnClick(evt)}
              >
                Subtitles
              </button>
              <button
                ref={btnQuestionsRef}
                id="btnQuestions"
                type="button"
                className={`btn questions-mod${
                  subtitlesDisplayMode === "questions"
                    ? " btn-success display-mod-selected"
                    : ""
                }`}
                onClick={(evt) => questionsBtnOnClick(evt)}
              >
                Questions
              </button>
              <button
                ref={btnNoneRef}
                id="btnNone"
                type="button"
                className={`btn none-mod${
                  subtitlesDisplayMode === "none"
                    ? " btn-success display-mod-selected"
                    : ""
                }`}
                onClick={(evt) => noneBtnOnClick(evt)}
              >
                None
              </button>
            </div>
            <div className="right-sec">
              <div
                className="btn-group"
                role="group"
                aria-label="Basic mixed styles example"
              ></div>
              <GreenWindowButton
                subtitlesDisplayMode={subtitlesDisplayMode}
                isLtr={isLtr}
              />
              <button
                type="button"
                onClick={(evt) => navigatToEditSubtitle(evt)}
                className="btn btn-tr"
                disabled={!UserAddedList?.slides?.length || !selectedSlide}
              >
                Edit Subtitle
              </button>
            </div>
          </div>

          <div className="tab-sec">
            <div className="top-tab">
              <ul className="nav nav-tabs " id="myTab" role="tablist"></ul>
            </div>

            <div className="tab-content">
              <div
                className="tab-pane active"
                id="home"
                role="tabpanel"
                aria-labelledby="home-tab"
                tabIndex="0"
              >
                <div
                  id="bookContentCont"
                  className="slides-set  overflow-y-auto"
                >
                  <BookContent
                    isLtr={isLtr}
                    setSearchSlide={setSearchSlide}
                    setActivatedTab={setSelectedSlide}
                    activatedTab={selectedSlide}
                    targetItemId={selectedSlide}
                    contents={UserAddedList}
                    searchKeyword={searchSlide}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-center align-items-center mt-2 paginationStyle">
            <i
              className={`bi bi-chevron-left me-1 cursor-pointer ${
                selectedSlide <= 1 ? "disablecolor" : "custom-pagination"
              }`}
              onClick={() => {
                if (selectedSlide > 0) {
                  updateSelectedSlide(selectedSlide - 1);
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
                  isNaN(+maxSlideIndex)
                    ? { value: "/", label: "- / -" }
                    : {
                        value: `${selectedSlide}/${+maxSlideIndex + 1}`,
                        label: `${selectedSlide + 1}/${+maxSlideIndex + 1}`,
                      }
                }
                onChange={handleChange}
                options={[...Array(maxSlideIndex)?.keys(), maxSlideIndex]?.map(
                  (index) => ({
                    label: index + 1,
                    value: `${index + 1}/${+maxSlideIndex + 1}`,
                  })
                )}
              />
              <div className="underline"></div>
            </div>
            <span
              onClick={() => {
                updateSelectedSlide(selectedSlide + 1);
              }}
              className={` cursor-pointer ${
                maxSlideIndex < selectedSlide
                  ? "disablecolor"
                  : "custom-pagination"
              }`}
            >
              Next{" "}
              <i
                className={`bi bi-chevron-right  cursor-pointer  ${
                  maxSlideIndex < selectedSlide
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
              activatedTab={selectedSlide}
              setActivatedTab={setSelectedSlide}
              isLtr={isLtr}
            />
          </div>
          <div className="book-mark whit-s overflow-auto">
            <div className="top-head">
              <h3>Bookmarks</h3>
            </div>
            <DndProvider backend={HTML5Backend}>
              <div>
                {items?.length > 0 &&
                  items?.map((item, index) => (
                    <DraggableItem
                      key={index}
                      id={item.id}
                      setActivatedTab={setSelectedSlide}
                      bookmarkDelete={item.bookmark_id}
                      text={item?.bookmark_path}
                      fileUid={item?.file_uid}
                      index={index}
                      moveCard={moveCard}
                      setIsLtr={setIsLtr}
                    />
                  ))}
              </div>
            </DndProvider>
          </div>

          <div className="Questions whit-s overflow-auto">
            <div className="top-head d-flex justify-content-between">
              <h3>Questions</h3>
            </div>
            <QuestionMessage
              mode="subtitle"
              languagesList={broadcastLanguages}
              isLtr={isLtr}
            ></QuestionMessage>
          </div>
        </div>
      </div>
    </>
  );
};

export default Subtitles;
