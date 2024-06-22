import React, { useContext, useState, useEffect } from "react";
import "./PagesCSS/Newslide.css";
import Select from "react-select";
import SlideSplit from "../Utils/SlideSplit";
import { SetCustomSlideBySource } from "../Redux/NewSlide/NewSlide";
import GetLangaugeCode from "../Utils/Const";
import GenerateUID from "../Utils/Uid";
import {
  ArchiveAutoComplete,
  getAutocompleteSuggetion,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AppContext from "../AppContext";

const NewSlides = () => {
  const appContextlData = useContext(AppContext);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const languages = GetLangaugeCode();
  const uidRegex = /^[a-zA-Z0-9]{8}$/;

  const [tagList, setTagList] = useState([]);
  const [updateTagList, setUpdateTagList] = useState([]);
  const [contentSource, setContentSource] = useState("");
  const [slideLanguageOptions, setSlideLanguageOptions] = useState(["Hebrew", "Russian", "English", "Spanish"]);
  const [fileUid, setFileUid] = useState("");
  const [sourceUid, setSourceUid] = useState("");
  const [insertMethod, setInsertMethod] = useState("custom_file");
  const [selectedFile, setSelectedFile] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [showAutocompleteBox, setShowAutocompleteBox] = useState(false);
  const AutocompleteList = useSelector(getAutocompleteSuggetion);
  const [selectedOptions, setSelectedOptions] = useState([
    {
      label: appContextlData.broadcastLang.label,
      value: languages[appContextlData.broadcastLang.label],
    },
  ]);
  const [typingTimeout, setTypingTimeout] = useState(null);

  useEffect(() => {
    if (sourceUrl.length > 0) {
      dispatch(ArchiveAutoComplete({ query: sourceUrl, language: languages[appContextlData.broadcastLang.label] }));
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
      label: appContextlData.broadcastLang.label,
      value: languages[appContextlData.broadcastLang.label],
    });
  }, [appContextlData.broadcastLang.label]);

  useEffect(() => {
    const fetchData = async () => {
      // add name and update languages
      let request = {
        name: "KabbalahMedia",
        source_path: contentSource,
        source_uid: sourceUid,
        file_uid: fileUid,
        left_to_right: IsLangLtr(languages[appContextlData.broadcastLang.label]),
        languages: languages[appContextlData.broadcastLang.label],
        slides: updateTagList,
      };
      console.log(request)
      if (
        document.getElementById("upload_name") &&
        document.getElementById("upload_name").value.length > 0
      ) {
        request.name = document.getElementById("upload_name").value;
        request.source_path = document.getElementById("upload_name").value;
      } else {
        if (contentSource.includes("https://kabbalahmedia.info")) {
          let parts = sourceUrl.split("/");
          request.source_path = parts[parts.length - 1]
        }
      }
      if (
        document.getElementById("languageSelect") &&
        slideLanguageOptions.length > 0
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
            alert("Wrong request. File is not a txt file. Please check your upload file");
          } else if (response.payload.error.includes("SQLSTATE 23505")) {
            alert("Wrong request. The file uid is duplicated. Please check your input");
          }
          return;
        }
        if (response.payload !== undefined && response.payload.success) {
          setUpdateTagList([]);
          setSourceUid("");
          alert(response.payload.description);
          navigate("/archive?file_uid=" + fileUid);
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
      case 'he':
        return false;
      case 'ar':
        return false;
      default:
        return true;
    }
  }

  const handleUpload = () => {
    try {
      const name = document.getElementById("upload_name").value;
      if (name === "") {
        alert("Name must be filled");
        return;
      }

      setSourceUid("upload_" + GenerateUID(8));
      setFileUid("upload_" + GenerateUID(8));
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContents = event.target.result;
        const structuredArray = parseFileContents(fileContents);
        setTagList(structuredArray);
      };
      if (selectedFile.name.split('.').pop() !== "txt") {
        alert("The file must be txt file");
        return;
      }
      // Read the file as text
      reader.readAsText(selectedFile);
    } catch (error) {
      console.error("Error occurred:", error); // Handle any errors
    }
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceData, "text/html");
    const contentElements = doc.querySelectorAll("h1,h2,h3,h4,h5,h6,p");
    const paragraphArray = Array.from(contentElements).map((element) => ({
      tag: element.tagName,
      content: element.outerHTML,
    }));
    let tags = [];
    paragraphArray.forEach((elementInfo) => {
      const tagName = elementInfo.tag;
      const wordArray = elementInfo.content
        .replace(/<[^>]*>/g, "")
        .replace(/\n/g, "")
        .trim()
        .split("  ")
        .join(" ")
        .split(/(\s+)/);
      wordArray.forEach((word, index) => {
        const elementObject = {
          paragraphStart: index === 0,
          tagName: tagName,
          word: word,
        };
        tags.push(elementObject);
      });
    });
    setTagList(tags);
  };

  const loadSource = () => {
    let sourceUrl = `${contentSource}`;
    const fetchData = async () => {
      try {
        // get fileuid from source
        let sourceUidStr;
        if (sourceUrl.includes("https://kabbalahmedia.info/")) {
          let parts = sourceUrl.split("/");
          sourceUidStr = parts[parts.length - 1]
        } else if (sourceUid !== "") {
          sourceUidStr = sourceUid;
          if (sourceUidStr.includes("upload_")) {
            sourceUidStr = sourceUidStr.replace("upload_", "");
          }
        } else {
          if (uidRegex.test(sourceUrl)) {
            sourceUidStr = contentSource;
          } else {
            alert("The input must be source uid or source url");
            return
          }
        }
        sourceUrl = `https://kabbalahmedia.info/backend/content_units?id=${sourceUidStr}&with_files=true`;
        setSourceUid("upload_" + sourceUidStr);
        const sourceResponse = await fetch(sourceUrl);
        if (!sourceResponse.ok) {
          throw new Error(`Fetch failed with status ${sourceResponse.status}`);
        }
        const sourceData = await sourceResponse.json();
        let fileUid;
        if (sourceData.hasOwnProperty("content_units")) {
          const contentUnits = sourceData["content_units"];
          contentUnits.forEach((contentUnit) => {
            if (contentUnit.hasOwnProperty("files")) {
              const files = contentUnit["files"];
              files.forEach((file) => {
                if (
                  languages[appContextlData.broadcastLang.label] ===
                  file["language"] && file["type"] === "text"
                  && file["mimetype"] === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ) {
                  fileUid = file["id"];
                }
              });
            }
          });
        }
        if (fileUid === undefined) {
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
          return;
        }
        const contentData = await response.text();
        await loadSlides(contentData);
      } catch (error) {
        console.error("Error fetching or parsing data:", error.message);
      }
    };
    fetchData();
  };

  return (
    <div className="form-newsubtitle body-content Edit New-Subtitle">
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
                  slideLanguageOptions.map((slideLanguage) => {
                    if (languages[slideLanguage] !== languages[appContextlData.broadcastLang.label]) {
                      return {
                        label: slideLanguage,
                        value: languages[slideLanguage],
                      };
                    } else {
                      return null; // Skip the undesired option
                    }
                  }).filter(option => option !== null) // Filter out null options
                }
                value={selectedOptions}
                onChange={(selectedOptions) => {
                  setSelectedOptions(selectedOptions);
                }}
              />
            </div>
          </div>
          <div className="row m-4">
            <div>
              <input
                type="file"
                onChange={(event) => {
                  setSelectedFile(event.target.files[0]);
                }}
              />
              <button
                className="btn btn-light rounded-pill col-4"
                onClick={handleUpload}
                disabled={!selectedFile}
              >
                Add
              </button>
            </div>
          </div>
          <div>
            <SlideSplit
              tags={tagList}
              visible={false}
              updateSplitTags={setUpdateTagList}
              method={insertMethod}
            />
          </div>
        </>
      ) : (
        <>
          <div className="row m-4">
            <label>Language</label>
            <p>{appContextlData.broadcastLang.label}</p>
            <div className="input-box ">
              <label className="w-100">Source Path</label>
              <div className="form-group  autoComplete">
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
                  <ul className="suggestions" id="suggestions" style={{ display: "none" }}>
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
              <SlideSplit
                tags={tagList}
                visible={false}
                updateSplitTags={setUpdateTagList}
                method={insertMethod}
              />
            </div>
          </div >
        </>
      )}
    </div >
  );
};

export default NewSlides;
