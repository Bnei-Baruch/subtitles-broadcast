import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Select from "react-select";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";

import "./PagesCSS/Subtitle.css";

import { Search } from "../Layout/Search";
import { DM_NONE, DM_SUBTITLES, DM_QUESTIONS } from "../Utils/Const";
import { GetBookmarks, UpdateBookmarks } from "../Redux/BookmarksSlice";
import { GetSlides, clearSlices } from "../Redux/SlidesSlice";
import DraggableItem from "../Components/DraggableItem";
import Preview from "../Components/Preview";
import QuestionMessage from "../Components/QuestionMessage";
import { getSubtitleMqttTopic, getQuestionMqttTopic } from "../Utils/Common";
import { publishDisplyNoneMqttMessage, publishQuestion, publishSubtitle } from "../Utils/UseMqttUtils";
import {
  setLiveModeEnabled,
  setSubtitlesDisplayMode,
  setMqttSelectedSlide,
} from "../Redux/MQTT/mqttSlice";
import { Virtuoso } from 'react-virtuoso';
import { updateMergedUserSettings } from "../Redux/UserSettingsSlice";
import { Slide } from "../Components/Slide";
import { Edit } from "../Components/Edit";

const Subtitles = () => {
  const btnSubtitlesRef = React.createRef();
  const btnQuestionsRef = React.createRef();
  const btnNoneRef = React.createRef();
  const virtualRef = useRef();

  const dispatch = useDispatch();

  const [editSlideId, setEditSlideId] = useState("");
  const [searchSlide, setSearchSlide] = useState("");
  const { slides } = useSelector((state) => state.slides);
  const maxSlideIndex = slides.length ? slides[slides.length - 1].order_number : 0;

	const { bookmarks } = useSelector((state) => state.bookmarks);

  const {
    // Selected slide and file from bookmarks.
    // Showing slides on the center.
    selected_slide_id: userSelectedSlideId,
    selected_file_uid: userSelectedFileUID,

    broadcast_language_code: language,
    broadcast_program_code: channel,
  } = useSelector((state) => state.userSettings.userSettings);
  // Selected subtitle slide by user in the center column.
  const selectedUserSubtitleSlide = slides.find((slide) => slide.ID === userSelectedSlideId);

  const {
    subtitlesDisplayMode,
    mqttTopics,
    mqttMessages,
    isLiveModeEnabled,
  } = useSelector((state) => state.mqtt);

  const subtitleTopic = getSubtitleMqttTopic(channel, language);
  const subscribed = mqttTopics[subtitleTopic];
  console.log('Subscribed', subtitleTopic, mqttTopics, subscribed);

  // Immidiate gate keeper to block parallel updates.
  const canUpdateSelectedSlide = useRef(true);
  const updateSelectedSlide = useCallback((newSelectedSlideOrderNum) => {
    if (!canUpdateSelectedSlide.current) {
      return;
    }
    canUpdateSelectedSlide.current = false;

    if (newSelectedSlideOrderNum < 0) {
      newSelectedSlideOrderNum = 0;
    } else if (newSelectedSlideOrderNum > maxSlideIndex) {
      newSelectedSlideOrderNum = maxSlideIndex;
    }

    const targetSlideObj = slides.find((key) => key?.order_number === newSelectedSlideOrderNum);
    if (targetSlideObj) {
      publishSubtitle(targetSlideObj, mqttMessages, channel, language, subtitlesDisplayMode);
      Promise.all([
        dispatch(setMqttSelectedSlide(targetSlideObj)),
        dispatch(updateMergedUserSettings({ selected_slide_id: targetSlideObj.ID })),
        dispatch(UpdateBookmarks({
          bookmarks: [{
            file_uid: targetSlideObj.file_uid,
            slide_id: targetSlideObj.ID,
          }],
          language,
          channel,
          update: true,
        })).then(() => {
          return dispatch(GetBookmarks({ language, channel }));
        }),
      ]).then(() => {
        canUpdateSelectedSlide.current = true;
        setSearchSlide("");
      });
    }
  }, [slides, maxSlideIndex, dispatch, language, mqttMessages, subtitlesDisplayMode, channel]);

  const handleChange = (selectedOption) => {
    const inputValue = +selectedOption?.label - 1;
    updateSelectedSlide(inputValue);
  };

  const handleKeyPress = useCallback( (event) => {
    if (editSlideId || !slides || slides.length === 0) {
      return;
    }

    let currentIndex = slides.findIndex(
      (slide) => selectedUserSubtitleSlide && slide.order_number === selectedUserSubtitleSlide.order_number
    );

    if (currentIndex === -1) {
      console.warn("handleKeyPress: Current slide not found in slides");
      return;
    }

    let newIndex = currentIndex;
    if (event.keyCode === 40) {
      // Navigate down (next slide by index)
      newIndex = Math.min(currentIndex + 1, slides.length - 1);
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
      const newSlide = slides[newIndex];
      if (newSlide) {
        updateSelectedSlide(newSlide.order_number, newSlide);
      }
    }
  }, [slides, editSlideId, updateSelectedSlide, selectedUserSubtitleSlide]);

  useEffect(() => {
    // add event listener when the component mounts
    window.addEventListener("keydown", handleKeyPress);

    // remove event listener when the component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
		if (!editSlideId) {
			dispatch(GetBookmarks({ language, channel }));
		}
  }, [editSlideId, dispatch, language, channel]);

  useEffect(() => {
    if (!editSlideId) {
      if (userSelectedFileUID && bookmarks.find((bookmark) => bookmark.file_uid === userSelectedFileUID)) {
        dispatch(GetSlides({
          file_uid: userSelectedFileUID,
          keyword: searchSlide,
          reset: true,
          all: true,
          language,
          channel,
        }));
      } else {
        dispatch(clearSlices());
      }
    }
  }, [language, channel, editSlideId, searchSlide, userSelectedFileUID, dispatch, JSON.stringify(bookmarks)]);

  const moveCard = (fromIndex, toIndex) => {
    const updatedBookmarks = [...bookmarks];
    const [movedItem] = updatedBookmarks.splice(fromIndex, 1);
    updatedBookmarks.splice(toIndex, 0, movedItem);
    // Reorder bookmarks.
    dispatch(UpdateBookmarks({
      bookmarks: updatedBookmarks.map((bookmark, index) => ({...bookmark, order_number: index})),
      update: true,
      language,
      channel,
    })).then(() => {
      return dispatch(GetBookmarks({ language, channel }));
    });
  };

  function questionsBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnSubtitlesRef.current.classList.remove("btn-success");
    btnNoneRef.current.classList.remove("btn-success");

    dispatch(setSubtitlesDisplayMode(DM_QUESTIONS));

    // Republish existing question.
    const questionMqttTopic = getQuestionMqttTopic(channel, language);
    publishQuestion(mqttMessages[questionMqttTopic] || {}, mqttMessages, channel, language, DM_QUESTIONS);
  }

  function subtitlesBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnQuestionsRef.current.classList.remove("btn-success");
    btnNoneRef.current.classList.remove("btn-success");

    dispatch(setSubtitlesDisplayMode(DM_SUBTITLES));
    publishSubtitle(selectedUserSubtitleSlide, mqttMessages, channel, language, DM_SUBTITLES);
  }

  function noneBtnOnClick(evt) {
    evt.target.classList.add("btn-success");
    btnSubtitlesRef.current.classList.remove("btn-success");
    btnQuestionsRef.current.classList.remove("btn-success");

    dispatch(setSubtitlesDisplayMode(DM_NONE));
    publishDisplyNoneMqttMessage(mqttMessages, channel, language);
  }

  useEffect(() => {
    const index = slides.findIndex((item) => item.ID === userSelectedSlideId);
    if (index > -1 && virtualRef.current) {
      setTimeout(() => {
        virtualRef.current.scrollToIndex({
          index: Math.max(0, index-1),
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [slides, userSelectedSlideId]);

  const Row = (index) => {
    const slide = slides[index];
    return (
      <div
        key={`slide_${slide.ID}`}
        id={`slide_${slide.ID}`}
        source-uid={slide.source_uid}
        onClick={() => updateSelectedSlide(slide.order_number)}
        className={`box-content d-flex cursor-pointer ${userSelectedSlideId === slide.ID ? "activeSlide" : ""}`}
      >
        <div className={"outline" + (userSelectedSlideId  === slide.ID ? " active" : "")}></div>
        <Slide
          content={slide.slide}
          isLtr={slide.left_to_right}
          searchKeyword={searchSlide}
          isQuestion={slide.slide_type === "question"}
        ></Slide>
        <span className="order-number">{`${
          slide?.languages.length > 1
            ? slide?.languages[+index % slide?.languages.length]
            : slide?.languages[0]
        } ${+slide.order_number + 1}`}</span>
        <IconButton
          className="edit-slide-button"
          onClick={(event) => {
            event.stopPropagation();
            setEditSlideId(slide.ID);
          }}
        >
          <EditIcon />
        </IconButton>
      </div>
    );
  };

  const openGreenScreen = () => {
    const popupFeatures = [
      'fullscreen=yes',
      'popup=1',
      'menubar=0',
      'toolbar=0',
      'location=0',
      'resizable=0',
      'scrollbars=0',
      'status=0',
      'width=720',
      'height=410',
      'left=200',
      'top=200',
    ].join(',');
    window.open('/green-window', '_blank', popupFeatures);
  };

  return (
    <>
      {editSlideId && <Edit fileUid={userSelectedFileUID} slideId={editSlideId} handleClose={() => setEditSlideId("")} />}
      {!editSlideId && <div className="body-content d-flex ">
        <div className="left-section row">
          <div className="innerhead d-flex justify-content-between subtitle-header">
						<Search 
              search={searchSlide}
              searchChanged={setSearchSlide} />
            <div
              className="btn-group"
              role="group"
              aria-label="Basic mixed styles example"
            >
              <button
                className={`live-button btn ${isLiveModeEnabled ? "btn-danger" : "btn-outline-danger"}`}
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
              <button
                type="button"
                onClick={() => openGreenScreen()}
                className="btn btn-tr"
                style={{ color: "green"}}
                disabled={!subscribed || !isLiveModeEnabled}
              >
                Green Window
              </button>
              <button
                type="button"
                onClick={() => setEditSlideId(userSelectedSlideId)}
                className="btn btn-tr"
                disabled={!slides?.length || !selectedUserSubtitleSlide}
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
                  className="slides-set overflow-y-auto"
                >
                  {slides.length > 0 && (
                    <div className="subtitles-virtual-slide">
                      <Virtuoso
                        ref={virtualRef}
                        totalCount={slides.length}
                        itemContent={Row}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-center align-items-center mt-2 paginationStyle">
            <i
              className={`bi bi-chevron-left me-1 cursor-pointer ${
                selectedUserSubtitleSlide?.order_number <= 0
                  ? "disablecolor"
                  : "custom-pagination"
              }`}
              onClick={() => {
                if (selectedUserSubtitleSlide?.order_number > 0) {
                  updateSelectedSlide(selectedUserSubtitleSlide?.order_number - 1);
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
                    boxShadow: "none",
                    border: "none",
                    backgroundColor: "transparent",
                  }),
                  dropdownIndicator: (provided, state) => ({
                    ...provided,
                    display: "none",
                  }),
                  menuList: (provided, state) => ({
                    ...provided,
                    textAlign: "center",
                  }),
                  indicatorSeparator: (provided, state) => ({
                    ...provided,
                    display: "none",
                  }),
                }}
                value={
                  isNaN(+maxSlideIndex)
                    ? { value: "/", label: "- / -" }
                    : {
                        value: `${selectedUserSubtitleSlide?.order_number}/${+maxSlideIndex + 1}`,
                        label: `${selectedUserSubtitleSlide?.order_number + 1}/${+maxSlideIndex + 1}`,
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
                updateSelectedSlide(selectedUserSubtitleSlide?.order_number + 1);
              }}
              className={` cursor-pointer ${
                maxSlideIndex < selectedUserSubtitleSlide?.order_number
                  ? "disablecolor"
                  : "custom-pagination"
              }`}
            >
              Next{" "}
              <i
                className={`bi bi-chevron-right  cursor-pointer  ${
                  maxSlideIndex < selectedUserSubtitleSlide?.order_number
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
                {bookmarks.length > 0 &&
                  bookmarks.map((bookmark, index) => (
                    <DraggableItem
                      key={index}
                      parentId={bookmark.id}
                      parentBookmarkId={bookmark.bookmark_id}
                      text={bookmark.bookmark_path}
                      parentBookmarkFileUid={bookmark.file_uid}
                      parentIndex={index}
                      moveCard={moveCard}
                      parentSlideId={bookmark.slide_id}
                      bookmarkDeleted={() => dispatch(GetBookmarks({ language, channel }))}
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
      </div>}
    </>
  );
};

export default Subtitles;
