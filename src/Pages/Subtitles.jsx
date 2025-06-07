import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Select from "react-select";

import "./PagesCSS/Subtitle.css";

import { DM_NONE, DM_SUBTITLES, DM_QUESTIONS, MAX_SLIDE_LIMIT, broadcastLanguages } from "../Utils/Const";
import { getAllBookAddedByUser, clearAllBookmarks } from "../Redux/Subtitle/SubtitleSlice";
import BookContent from "../Components/BookContent";
import { GetSubtitleData } from "../Redux/Subtitle/SubtitleSlice";
import DraggableItem from "../Components/DraggableItem";
import GreenWindowButton from "../Components/GreenWindowButton";
import Preview from "../Components/Preview";
import QuestionMessage from "../Components/QuestionMessage";
import { useNavigate } from "react-router-dom";
import { updateMergedUserSettings } from "../Redux/UserSettings/UserSettingsSlice";
import LoadingOverlay from "../Components/LoadingOverlay";
import { getSubtitleMqttTopic, getQuestionMqttTopic } from "../Utils/Common";
import { publishDisplyNoneMqttMessage, publishQuestion, publishSubtitle } from "../Utils/UseMqttUtils";
import {
  BookmarksSlide,
  UserBookmarkList,
  getAllBookmarkList,
  getAllBookmarkListLoading,
  BookmarkSlide,
} from "../Redux/ArchiveTab/ArchiveSlice";
import {
  setLiveModeEnabled,
  setSubtitlesDisplayMode,
  setUserSelectedSlide,
} from "../Redux/MQTT/mqttSlice";

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const Subtitles = () => {
  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode
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
  const navigate = useNavigate();
  const selectedSubtitleSlide = useSelector(
    (state) => state.mqtt.selectedSubtitleSlide,
    (prev, next) => prev?.ID === next?.ID
  );
  const userSlides = useSelector(
    (state) => state.SubtitleData?.contentList?.data?.slides
  );
  const userSettings = useSelector((state) => state.userSettings.userSettings);
  const userSelectedFileUID = userSettings?.selected_file_uid || null;

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );
  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson"
  );

  const mqttTopics = useSelector((state) => state.mqtt.mqttTopics);
  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);
  const subtitleTopic = getSubtitleMqttTopic(broadcastProgrammCode, broadcastLangCode);
  const subscribed = mqttTopics[subtitleTopic];

  const [loading, setLoading] = useState(false);
  const isLiveModeEnabled = useSelector(
    (state) => state.mqtt.isLiveModeEnabled
  );

  const updateSelectedSlide = (newSelectedSlideOrderNum, newSlide) => {
    if (newSelectedSlideOrderNum < 0) {
      newSelectedSlideOrderNum = 0;
    } else if (newSelectedSlideOrderNum > maxSlideIndex) {
      newSelectedSlideOrderNum = maxSlideIndex;
    }

    const targetSlideObj = UserAddedList?.slides?.find(
      (key) => key?.order_number === newSelectedSlideOrderNum
    );

    if (targetSlideObj) {
      publishSubtitle(targetSlideObj, mqttMessages, broadcastProgrammCode, broadcastLangCode, subtitlesDisplayMode);
      Promise.all([
        dispatch(setUserSelectedSlide(targetSlideObj)),
        dispatch(updateMergedUserSettings({ selected_slide_id: targetSlideObj.ID })),
        dispatch(
          BookmarkSlide({
            data: {
              file_uid: targetSlideObj.file_uid,
              slide_id: targetSlideObj.ID,
              update: true,
            },
            language: broadcastLangCode,
          })
        ),
      ]).finally(() => {
        setLoading(false);
      });
    }
  };

  const handleChange = (selectedOption) => {
    const inputValue = +selectedOption?.label - 1;
    updateSelectedSlide(inputValue);
  };

  const handleKeyPress = useCallback(
    (event) => {
      if (
        !UserAddedList ||
        !UserAddedList.slides ||
        UserAddedList.slides.length === 0
      ) {
        return;
      }

      let currentIndex = UserAddedList.slides.findIndex(
        (slide) => slide.order_number === selectedSubtitleSlide?.order_number
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
          updateSelectedSlide(newSlide.order_number, newSlide);
        }
      }
    },
    [UserAddedList, updateSelectedSlide]
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
    if (broadcastLangCode) {
      dispatch(UserBookmarkList({ language: broadcastLangCode }));
      dispatch(clearAllBookmarks());
    }
  }, [dispatch, broadcastLangCode]);

  //This useEffect will get all fileid from local storage and make api call
  useEffect(() => {
    if (!allBookmarkListLoading) {
      setItems(allBookmarkList);
    }
  }, [allBookmarkList, allBookmarkListLoading]);

  useEffect(() => {
    if (searchSlide.length > 0 || searchSlide !== previousSearch) {
      let file_uid = userSelectedFileUID;
      if (file_uid) {
        dispatch(
          GetSubtitleData({
            file_uid: file_uid,
            keyword: searchSlide,
            limit: MAX_SLIDE_LIMIT,
          })
        );
        setIsLtr(UserAddedList?.slides[0]?.left_to_right);
      }
    }
  }, [searchSlide, previousSearch, userSelectedFileUID, dispatch]);

  useEffect(() => {
    if (
      !selectedSubtitleSlide &&
      allBookmarkList?.length > 0 &&
      userSlides?.length > 0
    ) {
      const bookmarkedSlideId = allBookmarkList.find(
        (b) => b.slide_id === selectedSubtitleSlide?.ID
      )?.slide_id;

      if (bookmarkedSlideId) {
        const selectedSlide = userSlides.find(
          (slide) => slide.ID === bookmarkedSlideId
        );

        if (selectedSlide) {
          dispatch(setUserSelectedSlide(selectedSlide));
        }
      }
    }
  }, [selectedSubtitleSlide, allBookmarkList, userSlides, dispatch]);

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

    dispatch(setSubtitlesDisplayMode(DM_QUESTIONS));

    // Republish existing question.
    const questionMqttTopic = getQuestionMqttTopic(broadcastProgrammCode, broadcastLangCode);
    publishQuestion(mqttMessages[questionMqttTopic] || {}, mqttMessages, broadcastProgrammCode, broadcastLangCode, DM_QUESTIONS);
  }

  function subtitlesBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnQuestionsRef.current.classList.remove("btn-success");
    btnNoneRef.current.classList.remove("btn-success");

    dispatch(setSubtitlesDisplayMode(DM_SUBTITLES));
    publishSubtitle(selectedSubtitleSlide, mqttMessages, broadcastProgrammCode, broadcastLangCode, DM_SUBTITLES);
  }

  function noneBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnSubtitlesRef.current.classList.remove("btn-success");
    btnQuestionsRef.current.classList.remove("btn-success");

    dispatch(setSubtitlesDisplayMode(DM_NONE));
    publishDisplyNoneMqttMessage(mqttMessages, broadcastProgrammCode, broadcastLangCode);
  }

  const navigatToEditSubtitle = () => {
    const file_uid = UserAddedList?.slides?.[0]?.file_uid;
    const slide = UserAddedList?.slides?.find(
      (key) => key?.order_number === selectedSubtitleSlide?.order_number
    );
    const slideID = slide ? slide.ID : null;
    const editUrl = `/archive/edit?file_uid=${file_uid}&slide_id=${slideID}`;

    navigate(editUrl, {
      state: { previousLocation: window.location.pathname },
    });
  };

  return (
    <>
      <LoadingOverlay loading={loading} />
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
                className={`btn ${isLiveModeEnabled ? "btn-danger" : "btn-outline-danger"}`}
                onClick={() => dispatch(setLiveModeEnabled(!isLiveModeEnabled))}
              >
                {isLiveModeEnabled ? "Live: ON" : "Live: OFF"}
              </button>
              <button
                ref={btnSubtitlesRef}
                disabled={!isLiveModeEnabled || !subscribed}
                id="btnSubtitles"
                type="button"
                className={`btn sources-mod${
                  subtitlesDisplayMode === "subtitles"
                    ? " btn-success display-mod-selected"
                    : ""
                }`}
                onClick={(evt) => subtitlesBtnOnClick(evt)}
              >
                Subtitles
              </button>
              <button
                ref={btnQuestionsRef}
                disabled={!isLiveModeEnabled || !subscribed}
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
                disabled={!isLiveModeEnabled || !subscribed}
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
                isLoading={!isLiveModeEnabled || !subscribed}
                disabled={!isLiveModeEnabled}
              />
              <button
                type="button"
                onClick={(evt) => navigatToEditSubtitle(evt)}
                className="btn btn-tr"
                disabled={
                  !UserAddedList?.slides?.length || !selectedSubtitleSlide
                }
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
                    slideOrderNumber={selectedSubtitleSlide?.order_number}
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
                selectedSubtitleSlide?.order_number <= 0
                  ? "disablecolor"
                  : "custom-pagination"
              }`}
              onClick={() => {
                if (selectedSubtitleSlide?.order_number > 0) {
                  updateSelectedSlide(selectedSubtitleSlide?.order_number - 1);
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
                        value: `${selectedSubtitleSlide?.order_number}/${+maxSlideIndex + 1}`,
                        label: `${selectedSubtitleSlide?.order_number + 1}/${+maxSlideIndex + 1}`,
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
                updateSelectedSlide(selectedSubtitleSlide?.order_number + 1);
              }}
              className={` cursor-pointer ${
                maxSlideIndex < selectedSubtitleSlide?.order_number
                  ? "disablecolor"
                  : "custom-pagination"
              }`}
            >
              Next{" "}
              <i
                className={`bi bi-chevron-right  cursor-pointer  ${
                  maxSlideIndex < selectedSubtitleSlide?.order_number
                    ? "disablecolor"
                    : "custom-pagination"
                }`}
              />
            </span>
          </div>
        </div>

        <div className="right-section">
          <div className="first-sec">
            <Preview />
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
                      parentId={item.id}
                      parentBookmarkId={item.bookmark_id}
                      text={item?.bookmark_path}
                      parentBookmarkFileUid={item?.file_uid}
                      parentIndex={index}
                      moveCard={moveCard}
                      parentSlideId={item.slide_id}
                    />
                  ))}
              </div>
            </DndProvider>
          </div>

          <div className="Questions whit-s overflow-auto">
            <div className="top-head d-flex justify-content-between">
              <h3>Questions</h3>
            </div>
            <QuestionMessage></QuestionMessage>
          </div>
        </div>
      </div>
    </>
  );
};

export default Subtitles;
