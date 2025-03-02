import React, { useState, useEffect } from "react";
import "./PagesCSS/Newslide.css";
import Select from "react-select";
import { SplitToSlides, sourceToMarkdown } from "../Utils/SlideSplit";
import GenerateUID from "../Utils/Uid";
import { SetCustomSlideBySource } from "../Redux/NewSlide/NewSlide";
import { broadcastLangMapObj, broadcastLanguages } from "../Utils/Const";
import GetFileUid from "../Utils/Source";
import {
  ArchiveAutoComplete,
  getAutocompleteSuggetion,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { languageIsLtr } from "../Utils/Common";
import LoadingOverlay from "../Components/LoadingOverlay";
import { updateSettingsInternal } from "../Redux/UserSettings/UserSettingsSlice";

const NewSlides = () => {
  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const uidRegex = /^[a-zA-Z0-9]{8}$/;

  const [, setTagList] = useState([]);
  const [wholeText, setWholeText] = useState("");
  const [splitActive, setSplitActive] = useState(false);
  const [updateTagList, setUpdateTagList] = useState([]);
  const [contentSource, setContentSource] = useState("");
  const [fileUid, setFileUid] = useState("");
  const [sourceUid, setSourceUid] = useState("");
  const [insertMethod, setInsertMethod] = useState("custom_file");
  const [customText, setCustomText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [showAutocompleteBox, setShowAutocompleteBox] = useState(false);
  const AutocompleteList = useSelector(getAutocompleteSuggetion);
  const [selectedOptions, setSelectedOptions] = useState([
    {
      label: broadcastLangMapObj[broadcastLangCode].label,
      value: broadcastLangCode,
    },
  ]);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [isLtr] = useState(() => {
    return languageIsLtr(broadcastLangCode);
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sourceUrl.length > 0) {
      dispatch(
        ArchiveAutoComplete({
          query: sourceUrl,
          language: broadcastLangCode,
        })
      );
    }
  }, [sourceUrl]);

  useEffect(() => {
    const ulElement = document.getElementById("suggestions");
    if (ulElement !== null) {
      ulElement.style.display = "block";
    }
  }, [AutocompleteList]);

  useEffect(() => {
    setSelectedOptions({
      label: broadcastLangMapObj[broadcastLangCode].label,
      value: broadcastLangCode,
    });
  }, [broadcastLangCode]);

  useEffect(() => {
    const fetchData = async () => {
      // add name and update languages
      let request = {
        name: "KabbalahMedia",
        source_path: contentSource,
        source_uid: sourceUid,
        file_uid: fileUid,
        left_to_right: IsLangLtr(broadcastLangCode),
        languages: broadcastLangCode,
        slides: updateTagList,
      };
      if (
        document.getElementById("upload_name") &&
        document.getElementById("upload_name").value.length > 0
      ) {
        request.name = document.getElementById("upload_name").value;
        request.source_path = document.getElementById("upload_name").value;
      } else {
        if (contentSource.includes("https://kabbalahmedia.info")) {
          let parts = sourceUrl.split("/");
          request.source_path = parts[parts.length - 1];
        }
      }
      if (
        document.getElementById("languageSelect") &&
        broadcastLanguages.length > 0
      ) {
        let languages = [];
        if (Array.isArray(selectedOptions)) {
          selectedOptions?.forEach((option) => {
            languages.push(option.value);
          });
        } else {
          languages.push(selectedOptions.value);
        }
        request.languages = languages;
      }
      try {
        const response = await dispatch(SetCustomSlideBySource(request));
        if (response.payload.error !== "") {
          if (response.payload.error.includes("SQLSTATE 22021")) {
            alert(
              "Wrong request. File is not a txt file. Please check your upload file"
            );
          } else if (response.payload.error.includes("SQLSTATE 23505")) {
            alert(
              "Wrong request. The file uid is duplicated. Please check your input"
            );
          }
          return;
        }
        if (response.payload !== undefined && response.payload.success) {
          setUpdateTagList([]);
          setSourceUid("");
          alert(response.payload.description);

          const firstSlideId = response.payload.data?.slides?.[0]?.ID;

          dispatch(
            updateSettingsInternal({
              file_uid_for_edit_slide: fileUid,
            })
          );

          if (firstSlideId) {
            navigate(
              `/archive/edit?file_uid=${fileUid}&slide_id=${firstSlideId}`
            );
          } else {
            navigate(`/archive/edit?file_uid=${fileUid}`);
          }
        }
      } catch (error) {
        console.error("Error occurred:", error); // Handle any errors
      }
    };

    if (updateTagList.length > 0) {
      fetchData();
    }
  }, [updateTagList]);

  const IsLangLtr = (languageCode) => {
    switch (languageCode) {
      case "he":
        return false;
      case "ar":
        return false;
      default:
        return true;
    }
  };

  const uploadFile = (filename) => {
    // Read from file.
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomText(event.target.result);
      document.getElementById("custom-textarea").value = event.target.result;
    };
    if (filename.name.split(".").pop() !== "txt") {
      alert("The file must be txt file");
      return;
    }
    try {
      reader.readAsText(filename);
    } catch (error) {
      console.error("Error reading input fileoccurred:", error);
    }
  };

  const addSlidesFromCustomText = () => {
    const name = document.getElementById("upload_name").value;
    if (name === "") {
      alert("Name must be filled");
      return;
    }
    setSourceUid("upload_" + GenerateUID(8));
    setFileUid("upload_" + GenerateUID(8));
    const structuredArray = parseFileContents(customText);
    setTagList(structuredArray);
    setWholeText(customText);
    setSplitActive(true);
  };

  const parseFileContents = (fileContents) => {
    const wordsArray = fileContents.replace(/\r?\n/g, " <br/> ").split(/\s+/);
    let structuredArray = [];
    let previousWord = "";
    wordsArray.forEach((word, index) => {
      const elementObject = {
        paragraphStart: previousWord === "<br/>" && word !== "<br/>",
        tagName: "",
        word: word,
      };
      structuredArray.push(elementObject);
      previousWord = word;
    });
    return structuredArray;
  };

  const loadSlides = async (sourceData) => {
    const markdown = sourceToMarkdown(sourceData);
    let parse = parseFileContents(markdown);
    setTagList(parse);
    setWholeText(markdown);
    setSplitActive(true);
  };

  const loadSource = () => {
    setLoading(true);
    let sourceUrl = `${contentSource}`;
    const fetchData = async () => {
      try {
        // get fileuid from source
        let sourceUidStr;
        if (sourceUrl.includes("https://kabbalahmedia.info/")) {
          let parts = sourceUrl.split("/");
          sourceUidStr = parts[parts.length - 1];
        } else if (sourceUid !== "") {
          sourceUidStr = sourceUid;
          if (sourceUidStr.includes("upload_")) {
            sourceUidStr = sourceUidStr.replace("upload_", "");
          }
        } else {
          if (uidRegex.test(sourceUrl)) {
            sourceUidStr = contentSource;
          } else {
            setLoading(false);
            alert("The input must be source uid or source url");
            return;
          }
        }
        setSourceUid("upload_" + sourceUidStr);
        let fileUid = await GetFileUid(broadcastLangCode, sourceUidStr);
        if (fileUid === undefined) {
          setLoading(false);
          alert("File not found");
          return;
        }
        setFileUid("upload_" + fileUid);
        // get contents from fileuid
        const response = await fetch(
          `https://kabbalahmedia.info/assets/api/doc2html/${fileUid}`
        );
        if (response.status !== 200) {
          if (response.status === 404) {
            alert("File not found");
          } else {
            alert("Failed to load a file");
          }
          setLoading(false);
          return;
        }
        const contentData = await response.text();
        await loadSlides(contentData);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        console.error("Error fetching or parsing data:", error.message);
      }
    };
    fetchData();
  };

  return (
    <div className="form-newsubtitle body-content Edit New-Subtitle">
      <LoadingOverlay loading={loading} />
      <h3 className="mb-4">New slide set</h3>
      <div className="row">
        <button
          className={
            insertMethod === "custom_file"
              ? "active-button col-6"
              : "inactive-button col-6"
          }
          onClick={() => setInsertMethod("custom_file")}
        >
          Custom
        </button>
        <button
          className={
            insertMethod === "source_url"
              ? "active-button col-6"
              : "inactive-button col-6"
          }
          onClick={() => setInsertMethod("source_url")}
        >
          From KabbalahMedia
        </button>
      </div>
      {insertMethod === "custom_file" ? (
        <>
          <div className="row m-4">
            <div className="input-box ">
              <label className="w-100">Name</label>
              <input className="form-control" type="type" id="upload_name" />
            </div>
          </div>
          <div className="row m-4">
            <div className="input-box col-7">
              <label>Languages</label>
              <Select
                id="languageSelect"
                isMulti
                options={
                  broadcastLanguages
                    .map((langObj) => {
                      if (langObj.value !== broadcastLangCode) {
                        return {
                          label: langObj.label,
                          value: langObj.value,
                        };
                      } else {
                        return null; // Skip the undesired option
                      }
                    })
                    .filter((option) => option !== null) // Filter out null options
                }
                value={selectedOptions}
                onChange={(selectedOptions) => {
                  setSelectedOptions(selectedOptions);
                }}
              />
            </div>
          </div>
          <div className="row m-4">
            <div className="input-box col-7">
              <input
                type="file"
                onChange={(event) => {
                  uploadFile(event.target.files[0]);
                }}
              />
              <textarea
                id="custom-textarea"
                style={{
                  marginTop: "1em",
                  marginBottom: "1em",
                  height: "500px",
                  width: "500px",
                }}
                onChange={(event) => {
                  setCustomText(event.target.value);
                }}
                dir={isLtr ? "ltr" : "rtl"}
                placeholder="Enter text here"
              />
              <button
                className="btn btn-light rounded-pill col-4"
                onClick={addSlidesFromCustomText}
                disabled={!customText}
              >
                Add
              </button>
            </div>
          </div>
          <div>
            <SplitToSlides
              markdown={wholeText}
              active={splitActive}
              visible={false}
              updateSlides={(slides) => {
                setSplitActive(false);
                setUpdateTagList(slides);
              }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="row m-4">
            <label>Language</label>
            <p>{broadcastLangMapObj[broadcastLangCode].label}</p>
            <div className="input-box ">
              <label className="w-100">Source Path</label>
              <div className="form-group autoComplete">
                <input
                  className="form-control"
                  type="type"
                  value={contentSource}
                  onChange={(e) => {
                    setContentSource(e.target.value);
                    setShowAutocompleteBox(false);
                    clearTimeout(typingTimeout);
                    const timeoutId = setTimeout(() => {
                      // Perform action after typing has stopped
                      setShowAutocompleteBox(true);
                      setSourceUrl(e.target.value);
                    }, 500); // Adjust the timeout duration as needed
                    // Store the timeout ID for future reference
                    setTypingTimeout(timeoutId);
                  }}
                />
                {showAutocompleteBox && sourceUrl.length > 0 && (
                  <ul
                    className="suggestions"
                    id="suggestions"
                    style={{ display: "none" }}
                  >
                    {AutocompleteList?.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={(event) => {
                          event.target.parentNode.style.display = "none";
                          setContentSource(suggestion.source_path);
                          setSourceUid(suggestion.source_uid);
                        }}
                      >
                        {suggestion.source_path}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm col-3 m-4"
              onClick={loadSource}
            >
              Add Source
            </button>
            <div>
              <SplitToSlides
                markdown={wholeText}
                active={splitActive}
                visible={false}
                updateSlides={(slides) => {
                  setSplitActive(false);
                  setUpdateTagList(slides);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NewSlides;
