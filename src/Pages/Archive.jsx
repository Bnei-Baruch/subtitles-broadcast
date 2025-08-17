import React, { useCallback, useEffect, useRef ,useState } from "react";
import "./PagesCSS/Archive.css";
import { GetSlides } from "../Redux/SlidesSlice";
import { useDispatch, useSelector } from "react-redux";
import { Slide } from "../Components/Slide";
import { Edit } from "../Components/Edit";
import { Search } from "../Layout/Search";
import { Virtuoso } from 'react-virtuoso';
import { UnBookmarkSlide, UpdateBookmarks, GetBookmarks } from "../Redux/BookmarksSlice";

const SearchSpan = ({text, searchKeyword}) => {
  const [parts, setParts] = useState([]);

  useEffect(() => {
    if (searchKeyword !== undefined && searchKeyword !== "") {
      const escapeRegex = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/ig, "\\$&");
      };
      const escapedKeyword = escapeRegex(searchKeyword);
      const regex = new RegExp(escapedKeyword, "ig");
      const replaced = text.split(regex);
      setParts([replaced.reduce((acc, item, index) => {
        if (index > 0) {
          acc.push(<span key={index} className="search-span">{searchKeyword}</span>)
        }
        acc.push(item);
        return acc;
      }, [])]);
    } else {
      setParts([text])
    }
  }, [text, searchKeyword]);

  return (
    <>
      {parts.map((part) => part)}
    </>
  );
};

const more = async (dispatch, language, channel, search, slides, total) => {
	if (slides.length < total) {
		dispatch(GetSlides({
			language,
      channel, 
			keyword: search,
			reset: false,
			all: false,
		}));
	}
};

const Archive = () => {
  const dispatch = useDispatch();

  const virtualRef = useRef();

  const {
    broadcast_language_code: language,
    broadcast_program_code: channel,
  } = useSelector((state) => state.userSettings.userSettings);
  const [search, setSearch] = useState("")
  const { slides, total } = useSelector((state) => state.slides);
	const { bookmarks } = useSelector((state) => state.bookmarks);

  const [{editSlideId, editFileUid, editLimit, editScrollIndex}, setEdit] = useState({
    editSlideId: null,
    editFileUid: null,
    editLimit: 0,
    editScrollIndex: 0,
  });

  useEffect(() => {
		dispatch(GetSlides({
			language,
      channel,
			keyword: search,
			reset: true,
			all: false,
		}));
  }, [dispatch, language, channel, search]);

  useEffect(() => {
    dispatch(GetBookmarks({ language, channel }));
  }, [dispatch, language, channel]);

  const refetchSlidesAndBookmarks = useCallback((limit) => {
    // Update number of bookmarks.
    dispatch(GetBookmarks({ language, channel }));
    // Update slides.
    return dispatch(GetSlides({
      language,
      channel,
      keyword: search,
      reset: true,
      all: false,
      limit,
    }));
  }, [language, channel, dispatch, search]);

  const bookmarkHandler = (slide, index) => {
    dispatch(UpdateBookmarks({
      bookmarks: [{
        file_uid: slide.file_uid,
        slide_id: slide.ID,
        order_number: bookmarks.length,
      }],
      channel,
      language,
      update: false,
    })).then((res) => {
      if (res.payload.startsWith("The bookmark with the same file")) {
        if (window.confirm("A bookmark for this file exist, do you want to continue?")) {
          dispatch(UpdateBookmarks({
            bookmarks: [{
              file_uid: slide.file_uid,
              slide_id: slide.ID,
            }],
            channel,
            language,
            update: true,
          }))
        }
      }
    }).finally(() => refetchSlidesAndBookmarks(slides.length));
  };

  const unBookmarkHandler = (slide, index) => {
    dispatch(UnBookmarkSlide({
      bookmark_id: slide.bookmark_id,
    })).finally(() => refetchSlidesAndBookmarks(slides.length));
  };

  const handleEditClick = (slide, index) => {
    setEdit({
      editSlideId: slide.ID,
      editFileUid: slide.file_uid,
      editLimit: slides.length,
      editScrollIndex: index,
    });
  };

  const Row = (index) => {
    const slide = slides[index];
    return (
      <div
        key={slide.ID}
        style={{position: "relative", padding: "5px"}}
      >
        <div style={{border: "solid gray 1px", paddingBottom: "5px"}}>
          <Slide
            content={slide.slide}
            isLtr={slide.left_to_right}
            isQuestion={slide.slide_type === "question"}
            searchKeyword={search}
          />
        </div>
        <div className="source-path text-truncate">
          {slide.languages.length > 1
            ? <SearchSpan
                  searchKeyword={search}
                  text={`(${slide.languages[index % slide.languages.length]}) ${slide.slide_source_path}`} />
            : <SearchSpan
                  searchKeyword={search}
                  text={slide.slide_source_path} />}
        </div>
        <div className="action-buttons">
          {slide.bookmark_id !== null ? (
            <i
              onClick={() => unBookmarkHandler(slide, index)}
              className="bi bi-bookmark-check-fill m-2 cursor-pointer "
            />
          ) : (
            <i
              onClick={() => bookmarkHandler(slide, index)}
              className="bi bi-bookmark m-2 cursor-pointer "
            />
          )}
          <i
            className="bi bi-pencil m-2 cursor-pointer slava"
            onClick={() => handleEditClick(slide, index)}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {editSlideId &&
        <Edit fileUid={editFileUid}
              slideId={editSlideId}
              handleClose={() => {
                refetchSlidesAndBookmarks(editLimit).finally(() => {
                  setTimeout(() => {
                    if (virtualRef.current) {
                      virtualRef.current.scrollToIndex({
                        index: editScrollIndex,
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  }, 300);
                  setEdit({editSlideId: null, editFileUid: null, editLimit: 0, editScrollIndex: 0});
                });
              }} />}
      {!editSlideId && 
        <div
          className="archiveBackground  bg-light Edit"
          style={{ position: "relative" }}
        >
          <div className="top-autocomplete">
            <Search search={search} searchChanged={(newSearch) => setSearch(newSearch)} />
            <span>{total}</span>
          </div>
          <div className="card" style={{ border: "none", height: "calc(100vh - 50px)" }}>
            <Virtuoso
              ref={virtualRef}
              data={slides}
              itemContent={Row}
              endReached={() => more(dispatch, language, channel, search, slides, total)}
							overscan={1000}
            />
          </div>
        </div>
      }
    </>
  );
};

export default Archive;
