import React, { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { GetSlides, UpdateSourcePath, AddSlide, DeleteSlide, UpdateSlide } from "../Redux/SlidesSlice";
import { UnBookmarkSlide, UpdateBookmarks, GetBookmarks } from "../Redux/BookmarksSlice";
import { Slide } from "../Components/Slide";
import { SplitToSlides } from "../Utils/SlideSplit";
import Button from "@mui/material/Button";
import { isLtr } from "../Utils/Const";
import { Virtuoso } from 'react-virtuoso';
import { Search } from "../Layout/Search";

const findRow = (textArea) => {
  while (!!textArea && !textArea.className.includes("row")) {
    textArea = textArea.parentElement;
  }
  return textArea.parentElement;
};

const performSplit = async (editSlides, setEditSlides, selected, updatedSlideTextList, deleted, setDeleted) => {
  // Create a mutable copy of the array and its objects
  if (!editSlides.length) {
    return;
  }

  const cloneSlide = editSlides[0];
  const newSlideListData = [...editSlides];
  const offsetSlide = Math.max(0, Math.min(selected, newSlideListData.length - 1));
  let i = 0;

  // Keep existing slides that did not change intact.
  for (; i < updatedSlideTextList.length; i++) {
    if (newSlideListData[i + offsetSlide].slide !== updatedSlideTextList[i]) {
      break;
    }
  }

  // Update existing slides with new content, from i to the last.
  for (let j = i; j + offsetSlide < newSlideListData.length && j < updatedSlideTextList.length; j++) {
    newSlideListData[j + offsetSlide] = {
      ...newSlideListData[j + offsetSlide],
      slide: updatedSlideTextList[j],
    };
  }

  // Add new slided at the end.
  for (let j = newSlideListData.length - offsetSlide; j < updatedSlideTextList.length; j++) {
    const slideData = {
      file_uid: cloneSlide.file_uid,
      slide: updatedSlideTextList[j],
      order_number: newSlideListData.length,
      left_to_right: cloneSlide.left_to_right,
      languages: cloneSlide.languages,
    };
    newSlideListData.push(slideData);
  }

  if (newSlideListData.length - offsetSlide > updatedSlideTextList.length) {
    // Delete
    const deleteSlideIds = [];
    for (let j = offsetSlide + updatedSlideTextList.length; j < newSlideListData.length; j++) {
      deleteSlideIds.push(newSlideListData[j].ID);
    }
    setDeleted([...deleted, ...deleteSlideIds]);
    newSlideListData.splice(
      offsetSlide + updatedSlideTextList.length,
      newSlideListData.length - offsetSlide - updatedSlideTextList.length
    );
  }

  setEditSlides(newSlideListData);
};

const isDataChanged = (slidesA, slidesB) => {
  let isChanged = false;

  if (slidesA.length !== slidesB.length) {
    isChanged = true;
  } else {
    for (let i = 0; i < slidesA.length; i++) {
      const slideA = slidesA[i];
      const slideB = slidesB[i];

      if (
        slideA.order_number !== slideB.order_number ||
        slideA.slide_type !== slideB.slide_type ||
        slideA.renderer !== slideB.renderer ||
        slideA.left_to_right !== slideB.left_to_right ||
        slideA.slide.length !== slideB.slide.length ||
        slideA.slide !== slideB.slide
      ) {
        isChanged = true;
        break;
      }
    }
  }

  return isChanged;
};

const spliceSlideList = (editSlides, index, deleteCount, addSlides) => {
  const languages = editSlides[0].languages;
  const clone = [...editSlides];
  clone.splice(index, deleteCount, ...addSlides);
  return clone.map((slide, i) => {
    const updatedOrderNumber = Math.floor(i / languages.length);
    return {
      ...slide, // Spread the original slide object to create a new one
      order_number: updatedOrderNumber, // Update the order_number property
      languages,
    };
  });
};


export const Edit = ({ fileUid, slideId, handleClose }) => {
  const dispatch = useDispatch();

  // const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const {
    broadcast_language_code: language,
    broadcast_program_code: channel,
  } = useSelector((state) => state.userSettings.userSettings);

  const virtualRef = useRef();
  // Initial select of edit element.
  const hasSelected = useRef(false);

  const {slides} = useSelector((state) => state.slides);
  const [editSlides, setEditSlides] = useState([]);
  const { bookmarks } = useSelector((state) => state.bookmarks);

  const [search, setSearch] = useState("")

  const [selected, setSelected] = useState(0);
  const [selectedStart, setSelectedStart] = useState(-1);

  const [wholeText, setWholeText] = useState("");
  const [split, setSplit] = useState(false);
  const [updatedSlideTextList, setUpdatedSlideTextList] = useState([]);

  const [sourcePath, setSourcePath] = useState("");
  const [sourcePathId, setSourcePathId] = useState("");

  const [isSlideDataChanged, setIsSlideDataChanged] = useState(false);
  const [deleted, setDeleted] = useState([]);

  const [bookmarkId, setBookmarkId] = useState("");

  // Get bookmarks for order number if user adds a bookmark.
  useEffect(() => {
    dispatch(GetBookmarks({ language, channel }));
  }, [dispatch, language, channel]);

  const refetchSlides = useCallback(async (read_after_write = undefined) => {
    dispatch(
      GetSlides({
        file_uid: fileUid,
        language,
        channel,
        read_after_write: read_after_write ? "true" : undefined,
      })
    );
  }, [dispatch, fileUid, language, channel]);

  // Load data when the component mounts
  useEffect(() => {
    refetchSlides();
  }, [refetchSlides]);

  useEffect(() => {
    if (slides.length) {
      // Cancel or new set of slides loaded, reset editSlides.
      setEditSlides(slides);
      setSourcePath(slides[0].source_path);
      setSourcePathId(slides[0].source_path_id);
      setBookmarkId(slides.find((slide) => slide.bookmark_id !== null)?.bookmark_id || "");
      setDeleted([]);
    }
  }, [slides]);

  // Initial scroll Virtuoso into view.
  useEffect(() => {
    if (!hasSelected.current && slideId && editSlides.length > 0) {
      const index = editSlides.findIndex((slide) => slide.ID === slideId);
      if (index > -1 && virtualRef.current) {
        setTimeout(() => {
          virtualRef.current.scrollToIndex({
            index: Math.max(0, index-1),
            behavior: "smooth",
            block: "center",
          });
          hasSelected.current = true;
          setSelected(index);
          setSelectedStart(0);
        }, 100);
      }
    }
  }, [editSlides, slideId, hasSelected, setSelected]);

  // Focus and set cursor for textarea.
  useEffect(() => {
    if (selectedStart >= 0) {
      // Execute once.
      setSelectedStart(-1);

      const focusTextArea = () => {
        const textArea = document.querySelector(`[id="row_slide_${selected}"] textarea`);
        if (!textArea) {
          // Wait for textarea to properly scroll in Virtuoso.
          setTimeout(focusTextArea, 30);
          return;
        }

        textArea.focus();
        textArea.selectionStart = selectedStart;
        textArea.selectionEnd = selectedStart;
        if (textArea.selectionStart === 0) {
          textArea.scrollTop = 0;
        } else if (textArea.value.length === textArea.selectionStart) {
          textArea.scrollTop = textArea.scrollHeight;
        }
      };
      focusTextArea();
    }
  }, [selected, selectedStart]);

  const isSourcePathChanged = useCallback(() => {
    return !isNaN(sourcePathId) &&
      sourcePathId > 0 &&
      sourcePath &&
      sourcePath.trim() !== editSlides[0]?.source_path?.trim();
  }, [editSlides, sourcePath, sourcePathId]);

  // Monitor changes to editSlides and compare with slides (initial).
  useEffect(() => {
		setIsSlideDataChanged(isSourcePathChanged() || isDataChanged(slides, editSlides));
  }, [editSlides, slides, isSourcePathChanged]);

  useEffect(() => {
    // Performs split only when re-run clicked.
    if (split && !!updatedSlideTextList.length) {
      performSplit(editSlides, setEditSlides, selected, updatedSlideTextList, deleted, setDeleted);
      setSplit(false);
      setUpdatedSlideTextList([]);
    }
  }, [split, editSlides, setEditSlides, selected, updatedSlideTextList, setUpdatedSlideTextList, deleted, setDeleted]);

  const handleSave = useCallback(async () => {
    if (!isSlideDataChanged) {
      return;
    }

    const savePromises = [];
		// Update source path when needed.
    if (isSourcePathChanged()) {
			console.log('Updating source path', sourcePath, sourcePathId);
      savePromises.push(dispatch(UpdateSourcePath({
        data: {
          sourcePathId,
          sourcePath,
        },
			})));
    }

    if (deleted.length > 0) {
      savePromises.push(dispatch(DeleteSlide({
        data: {
          force_delete_bookmarks: true,
          slide_ids: deleted,
        },
      })));
    }

    const updateSlideList = editSlides
      .filter(({ ID }) => ID !== undefined)
      .map(
        ({ ID, slide, order_number, slide_type, renderer, left_to_right }, index) => ({
          slide_id: ID,
          slide,
          left_to_right: left_to_right === false ? false : true,
          order_number: order_number,
          slide_type,
          renderer,
        })
      );
    if (updateSlideList.length > 0) {
      savePromises.push(dispatch(UpdateSlide({ slides: updateSlideList })));
    }

    const addNewSlideList = editSlides
      .filter(({ ID }) => ID === undefined)
      .map(({ slide, order_number, slide_type, renderer }) => ({
        slide,
        order_number,
        left_to_right:
          editSlides[0] && editSlides[0].left_to_right === false
            ? false
            : true,
        file_uid: editSlides[0]?.file_uid,
        slide_type,
        renderer,
      }));
    if (addNewSlideList.length > 0) {
      savePromises.push(dispatch(AddSlide({ slides: addNewSlideList })));
    }

    await Promise.all(savePromises);
    refetchSlides(/* read_after_write */ true);
  }, [deleted, dispatch, isSlideDataChanged, isSourcePathChanged, editSlides, sourcePath, sourcePathId, refetchSlides]);

	// Re-split slides from selected slide and on.
  const rerun = () => {
    const parts = [];
    for (let i = selected; i < editSlides.length; i++) {
      parts.push(editSlides[i].slide);
    }
    setWholeText(parts.join("\r"));
    setSplit(true);
  };

  const handleBackBtn = (evt) => {
    if (isSlideDataChanged) {
      if (window.confirm('Drop changes?')) {
        handleClose();
      }
    } else {
      handleClose();
    }
  };

  const handleCancelBtn = () => {
    if (isSlideDataChanged) {
      if (window.confirm("Are you sure you want to cacel changes?")) {
        refetchSlides();
      }
    }
  };

  const toggleSlideDirection = (index, slide) => {
    setEditSlides(spliceSlideList(editSlides, index, 1, [{
      ...slide,
      left_to_right: !slide.left_to_right,
    }]));
  };

  const toggleSlideType = (index, slide) => {
    setEditSlides(spliceSlideList(editSlides, index, 1, [{
      ...editSlides[index],
      slide_type: slide.slide_type === "question" ? "subtitle" : "question",
    }]));
  }

  const toggleRenderer = (index, slide) => {
    setEditSlides(spliceSlideList(editSlides, index, 1, [{
      ...editSlides[index],
      renderer: slide.renderer === "default" ? "contrast" : "default",
    }]));
  }

  const handleSaveAndBack = async () => {
    await handleSave();
    handleClose();
  };

  const handleDeleteSlide = (index, slide) => {
    // Don't allow deleting if one slide left.
    if (editSlides.length <= 1) {
      return;
    }
    if (slide.bookmark_id) {
      if (!window.confirm('This slide is bookmarked, delete it with the bookmark?')) {
        // Don't delete.
        return;
      }
      handleToggleBookmark();
    }
    if (slide.ID) {
      setDeleted([...deleted, slide.ID]);
    }
    setEditSlides(spliceSlideList(editSlides, index, 1, []));
  };

  const handleToggleBookmark = () => {
    if (bookmarkId) {
      dispatch(UnBookmarkSlide({ bookmark_id: bookmarkId })).then((response) => {
				if (response.payload.success) {
					setBookmarkId("");
				}
			}).finally(() => {
        // Update number of bookmarks.
        dispatch(GetBookmarks({ language, channel }));
      });
    } else {
      dispatch(UpdateBookmarks({
				bookmarks: [{
          file_uid: editSlides[0].file_uid,
          slide_id: editSlides[0].ID,
          order_number: bookmarks.length,
				}],
        language,
        channel,
				update: false,
			})).then((response) => {
        if (response.payload[0].success) {
          setBookmarkId(response.payload[0].data.ID);
        }
        console.log(response);
      });
    }
  };

  const textareaKeydown = (e, index, slide) => {
    const textArea = e.target;
    const textAreaParent = findRow(textArea);
    if (e.key === "ArrowUp" &&
      // Select one text area up.
      textArea.selectionStart === textArea.selectionEnd &&
      textArea.selectionStart === 0 &&
      !!textAreaParent.previousElementSibling) {
      const prevTextArea =
        textAreaParent.previousElementSibling.querySelector("textarea");
      if (prevTextArea) {
        setSelected(index - 1);
        setSelectedStart(prevTextArea.value.length);
        e.preventDefault();
      }
    } else if (e.key === "ArrowDown" &&
      // Select one text area down;
      textArea.selectionStart === textArea.selectionEnd &&
      textArea.selectionStart === textArea.value.length &&
      !!textAreaParent.nextElementSibling) {
      const nextTextArea = (textAreaParent.nextElementSibling &&
        textAreaParent.nextElementSibling.querySelector("textarea")) || null;
      if (nextTextArea) {
        setSelected(index + 1);
        setSelectedStart(0);
        e.preventDefault();
      }
    } else if (e.key === "Enter" && e.ctrlKey &&
      textArea.selectionStart === textArea.selectionEnd) {
      // Ctrl+Enter - Move the rest of the text to next text-area.
      const nextTextArea = (textAreaParent.nextElementSibling &&
        textAreaParent.nextElementSibling.querySelector("textarea")) || null;
      let updatedSlideText = slide.slide.slice(0, textArea.selectionStart);
      if (updatedSlideText.endsWith('\n') || updatedSlideText.endsWith('\r')) {
        updatedSlideText = updatedSlideText.slice(0, -1);
      }
      const nextSlideText = slide.slide.slice(textArea.selectionStart);
      const updatedSlides = [{
        ...slide,
        slide: updatedSlideText,
      }];
      if (!nextTextArea) {
        updatedSlides.push({
          file_uid: slide.file_uid,
          slide: nextSlideText,
          slide_type: slide.slide_type,
          renderer: slide.renderer,
          left_to_right: slide.left_to_right,
          languages: slide.languages,
        });
        setEditSlides(spliceSlideList(editSlides, index, 1, updatedSlides));
      } else {
        const newLine = editSlides[index+1].slide && nextSlideText ? '\n' : '';
        updatedSlides.push({
          ...editSlides[index+1],
          slide: nextSlideText + newLine + editSlides[index+1].slide,
        });
        setEditSlides(spliceSlideList(editSlides, index, 2, updatedSlides));
      }
      setSelected(index + 1);
      setSelectedStart(0);
      e.preventDefault();
    } else if (e.keyCode === 8 &&
      textArea.selectionStart === 0 &&
      textArea.selectionEnd === 0 &&
      index > 0 &&
      !!textAreaParent && !!textAreaParent.previousElementSibling) {
      // Backspace - Move first line to previous text-area.
      const prevTextArea = textAreaParent.previousElementSibling.querySelector("textarea");
      if (prevTextArea) {
        const lines = slide.slide.split(/[\r\n]/);
        if (lines.length > 0) {
          const prevSlide = editSlides[index - 1];
          setEditSlides(spliceSlideList(editSlides, index - 1, 2, [
            { ...prevSlide, slide: prevSlide.slide + "\n" + lines[0]},
            { ...slide, slide: slide.slide.slice(lines[0].length + 1) },
          ]));
        }
        setSelected(index - 1);
        setSelectedStart(prevTextArea.value.length + 1);
        e.preventDefault();
      }
    }
  };

  const Row = (index) => {
    const slide = editSlides[index];
    return (
        <div
          className="edit-row"
          key={`row_slide_${slide.order_number}`}
          id={`row_slide_${slide.order_number}`}
        >
          <div className="edit-textarea"
               onClick={() => setSelected(index)}
               data-slide-id={slide.ID}>
            <div className={`adjustable-font box box2 ${index === selected ? "EditActiveSlide" : ""}`}>
              <textarea
                value={slide.slide}
                onKeyDown={(e) => textareaKeydown(e, index, slide)}
                onChange={(e) => {
                  let newValue = e.target.value;
                  // Perform any special handling for \r if needed
                  if (newValue.includes("\n")) {
                    newValue = newValue.replace(/\n/g, "\r");
                  }

                  // Update slide text.
                  setEditSlides(spliceSlideList(editSlides, index, 1, [{
                    ...slide,
                    slide: newValue,
                  }]));
                }}
                key={index}
                style={{ direction: slide.left_to_right === false ? "rtl" : "ltr" }}
              />

              {index === selected && (
                <i
                  onClick={() => handleDeleteSlide(index, slide)}
                  className="bi bi-trash3 delete-icon"
                  style={{[slide.left_to_right === false ? "left" : "right"]: "5px"}}
                />
              )}

              {index === selected && (
                <i
                  onClick={() => {
                    return toggleSlideDirection(index, slide);
                  }}
                  className={
                    (slide.left_to_right === false
                      ? "bi-arrow-bar-left"
                      : "bi-arrow-bar-right") + " bi delete-icon"
                  }
                  title={
                    slide.left_to_right === false
                      ? "The slide is Right To Left. Change it to the Left To Right press the iccon"
                      : "The slide is Left To Right. Change it to the Right To Left press the iccon"
                  }
                  style={{
                    color: "black",
                    [slide.left_to_right === false ? "left" : "right"]:
                      "104px",
                  }}
                />
              )}

              {index === selected && (
                <i
                  onClick={() => toggleRenderer(index, slide)}
                  className={
                    (slide.renderer === "default"
                      ? "bi-circle-fill"
                      : "bi-circle-half") + " bi delete-icon"
                  }
                  style={{
                    color: "#6c757d",
                    [slide.left_to_right === false ? "left" : "right"]:
                      "80px",
                  }}
                />
              )}

              {index === selected && (
                <i
                  onClick={() => toggleSlideType(index, slide)}
                  className={
                    (slide.slide_type === "question"
                      ? "bi-question-circle"
                      : "bi-card-text") + " bi delete-icon"
                  }
                  style={{
                    color: "black",
                    [slide.left_to_right === false ? "left" : "right"]:
                      "56px",
                  }}
                />
              )}

              {index === selected && (
                <i
                  onClick={() => rerun()}
                  className="bi bi-bootstrap-reboot delete-icon "
                  style={{
                    color: "black",
                    [slide.left_to_right === false ? "left" : "right"]:
                      "30px",
                  }}
                />
              )}

              {index === selected && (
                <i
                  onClick={() => {
                    const newEmptySlide = {
                      file_uid: slide.file_uid,
                      slide: "",
                      addedNew: true,
                      slide_type: "subtitle",
                      renderer: slide.renderer,
                      left_to_right: slide.left_to_right,
                      languages: slide.languages,
                    };
                    setEditSlides(spliceSlideList(editSlides, index + 1, 0, [newEmptySlide]));
                  }}
                  className="bi bi-plus-circle add-icon "
                />
              )}
            </div>
          </div>
          <div className="edit-slide">
            <div slide={index} className="slide-edit-container">
              <div className="outline"></div>
              <Slide
                searchKeyword={search}
                content={slide.slide}
                isLtr={slide && slide.left_to_right === false ? false : true}
                isQuestion={slide.slide_type === "question"}
                renderer={slide.renderer}
              />
              <span className="order-number">{`${
                slide?.languages.length > 1
                  ? slide?.languages[+index % slide?.languages.length]
                  : slide?.languages[0]
              } ${+slide.order_number + 1}`}</span>
            </div>
          </div>
        </div>
      );
  };

  return (
    <>
      <div className="archiveBackground bg-light Edit">
        <div className="button-container">
          <Search search={search} searchChanged={(newSearch) => setSearch(newSearch)} />
          <Button
            variant="contained"
            onClick={handleToggleBookmark}
            color="success"
            className={`btn  bookmark-btn  ${bookmarkId ? "btn-secondary" : "btn-info"}`}
          >
            {bookmarkId ? "Unbookmark" : "Bookmark"}
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => rerun()}
            className="btn btn-re-run"
          >
            Re-run
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleBackBtn}
            className=".btn btn-back"
          >
            Back
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleCancelBtn}
            className={`btn btn-cancel  ${isSlideDataChanged ? "subtitle-changed" : "cancel action-notallowed"}`}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="success"
            className={`"btn save  ${isSlideDataChanged ? "subtitle-changed" : "cancel action-notallowed"}`}
            onClick={handleSave}
          >
            Save
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveAndBack}
            className={`btn save ${isSlideDataChanged ? "subtitle-changed" : "cancel action-notallowed"}`}
          >
            Save & Back
          </Button>
        </div>
        <div className="card border-0 edit-source-path">
          <div className="top-row d-flex sticky-holder">
            <div className="responsive-container">
              <div>
                <input
                  type="text"
                  className={`update-source-path-inp form-control input  ${
                    isLtr(language) ? "ltr" : "rtl"
                  }`}
                  value={sourcePath}
                  onChange={(e) => { console.log(e.target.value.trim());  setSourcePath(e.target.value.trim()); }}
                  placeholder="Update Source Path"
                />
              </div>
              <span>{editSlides.length}</span>
            </div>
          </div>
        </div>
        <div className="edit-container">
          <Virtuoso
            ref={virtualRef}
            totalCount={editSlides.length}
            itemContent={Row}
          />
        </div>
        <div>
          <SplitToSlides
            markdown={wholeText}
            visible={false}
            active={split}
            renderer={(slides && slides.length && slides[0].renderer) || ''}
            updateSlides={(slides) => {
              setUpdatedSlideTextList(slides);
            }}
          />
        </div>
      </div>
    </>
  );
};

