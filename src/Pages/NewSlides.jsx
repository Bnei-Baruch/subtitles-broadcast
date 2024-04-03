import React, { useState, useEffect } from "react";
import "./PagesCSS/Newslide.css";
import Select from "react-select";
import SlideSplit from "../Utils/SlideSplit";
import {
  GetSlideLanguages,
  SetCustomSlideBySource,
} from "../Redux/NewSlide/NewSlide";
import GetLangaugeCode from "../Utils/Const";
import GenerateUID from "../Utils/Uid";
import {
  ArchiveAutoComplete,
  getAutocompleteSuggetion,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const NewSlides = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const languages = GetLangaugeCode();
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;

  const [tagList, setTagList] = useState([]);
  const [updateTagList, setUpdateTagList] = useState([]);
  const [contentSource, setContentSource] = useState("");
  const [slideLanguageOptions, setSlideLanguageOptions] = useState([]);
  const [fileUid, setFileUid] = useState("");
  const [sourceUid, setSourceUid] = useState("");
  const [insertMethod, setInsertMethod] = useState("custom_file");
  const [isChecked, setIsChecked] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [showAutocompleteBox, setShowAutocompleteBox] = useState(false);
  const AutocompleteList = useSelector(getAutocompleteSuggetion);
  const [selectedOptions, setSelectedOptions] = useState([
    {
      label: localStorage.getItem("subtitleLanguage"),
      value: languages[localStorage.getItem("subtitleLanguage")],
    },
  ]);
  const [typingTimeout, setTypingTimeout] = useState(null);

  useEffect(() => {
    if (sourceUrl.length > 0) {
      dispatch(ArchiveAutoComplete({ query: sourceUrl }));
    }
  }, [sourceUrl]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await dispatch(GetSlideLanguages());
        setSlideLanguageOptions(response.payload.data);
      } catch (error) {
        throw new Error(`Error fetching slide languages`, error);
      }
    };

    fetchData();
  }, [dispatch]);

  useEffect(() => {
    const fetchData = async () => {
      // add name and update langauges
      let request = {
        name: "KabbalahMedia",
        source_uid: sourceUid,
        file_uid: fileUid,
        languages: languages[localStorage.getItem("subtitleLanguage")],
        slides: updateTagList,
      };
      if (
        document.getElementById("upload_name") &&
        document.getElementById("upload_name").value.length > 0
      ) {
        request.name = document.getElementById("upload_name").value;
      }
      if (
        document.getElementById("languageSelect") &&
        slideLanguageOptions.length > 0
      ) {
        let languages = [];
        selectedOptions?.forEach((option) => {
          languages.push(option.value);
        });
        request.languages = languages;
      }
      const responsePromise = new Promise((resolve, reject) => {
        try {
          const response = dispatch(SetCustomSlideBySource(request));
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
      responsePromise
        .then((result) => {
          if (result.payload.success) {
            setUpdateTagList([]);
            setSourceUid("");
            alert(result.payload.description);
            navigate("/archive?file_uid=" + fileUid);
          }
        })
        .catch((error) => {
          console.error("Error occurred:", error); // Handle any errors during promise execution
        });
    };

    if (updateTagList.length > 0) {
      fetchData();
    }
  }, [updateTagList]);

  const handleUpload = () => {
    // Perform upload logic with selectedFile
    if (document.getElementById("upload_name").value === "") {
      alert("Name must be filled");
    } else {
      setSourceUid("upload_" + GenerateUID(8));
      setFileUid("upload_" + GenerateUID(8));
      if (selectedFile) {
        const reader = new FileReader();

        reader.onload = (event) => {
          let fileContents = event.target.result;
          fileContents = fileContents.replace(/\r?\n/g, " <br/> ");
          const wordsArray = fileContents.split(/\s+/);
          let structuredArray = [];
          let previousWord = "";
          wordsArray.forEach((word, index) => {
            const elementObject = {
              paragraphStart: false,
              tagName: "",
              word: word,
            };
            if (previousWord === "<br/>" && word !== "<br/>") {
              elementObject.paragraphStart = true;
            }
            structuredArray.push(elementObject);
            previousWord = word;
          });
          setTagList(structuredArray);
        };

        // Read the file as text
        reader.readAsText(selectedFile);
      } else {
        console.error("No file selected");
      }
    }
  };

  const loadSlides = async (sourceData) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceData, "text/html");
    // Extract text content from tags, for example, from all paragraphs
    const contentElements = doc.querySelectorAll("h1,p");
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
          paragraphStart: false,
          tagName: tagName,
          word: word,
        };
        if (index === 0) {
          elementObject.paragraphStart = true;
        }
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
        if (
          urlRegex.test(sourceUrl) &&
          sourceUrl.includes("kabbalahmedia.info/backend/content_units")
        ) {
          const url = new URL(sourceUrl);
          const params = new URLSearchParams(url.search);
          if (!params.has("id")) {
            throw new Error(`Fetch failed from source url misses id query`);
          }
          setSourceUid("upload_" + params.get("id"));
        } else {
          let sourceUidStr;
          if (sourceUid === "") {
            sourceUidStr = contentSource;
          } else {
            sourceUidStr = sourceUid;
          }
          sourceUrl = `https://kabbalahmedia.info/backend/content_units?id=${sourceUidStr}&with_files=true`;
          setSourceUid("upload_" + sourceUidStr);
        }
        const sourceResponse = await fetch(sourceUrl);
        if (sourceResponse.status !== 200) {
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
                  languages[localStorage.getItem("subtitleLanguage")] ===
                  file["language"]
                ) {
                  fileUid = file["id"];
                }
              });
            }
          });
        }
        setFileUid("upload_" + fileUid);
        // get contents from fileuid
        const response = await fetch(
          `https://kabbalahmedia.info/assets/api/doc2html/${fileUid}`
        );
        if (response.status !== 200) {
          throw new Error(`Fetch failed with status ${response.status}`);
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
            <div className="input-box col-3 ">
              <label className="w-100">Multilingual</label>
              <label className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    setIsChecked(e.target.checked);
                  }}
                />
                <span className="checkmark"></span>
              </label>
            </div>
            <div className="input-box col-7">
              <label>Languages</label>
              <Select
                id="languageSelect"
                isMulti
                options={
                  isChecked
                    ? slideLanguageOptions.map((slideLanguage) => {
                      if (slideLanguage !== languages[localStorage.getItem("subtitleLanguage")]) {
                        return {
                          label: Object.keys(languages).find(
                            (key) => languages[key] === slideLanguage
                          ),
                          value: slideLanguage,
                        };
                      } else {
                        return null; // Skip the undesired option
                      }
                    }).filter(option => option !== null) // Filter out null options
                    : []
                }
                value={selectedOptions}
                onChange={(selectedOptions) => {
                  setSelectedOptions(selectedOptions);
                }}
              />
            </div>
          </div>
          <div className="input-box ">
            <label className="w-100">Name</label>
            <input className="form-control" type="type" id="upload_name" />
          </div>

          <div className="row m-4">
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
              Upload File
            </button>
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
            <p>{localStorage.getItem("subtitleLanguage")}</p>
            <div className="input-box ">
              <label className="w-100">Source Path</label>
              <div className="form-group  autoComplete">
                <input
                  className="form-control"
                  type="type"
                  value={contentSource}
                  onChange={(e) => {
                    console.log(e.target.value);
                    setContentSource(e.target.value);
                    setShowAutocompleteBox(false);
                    clearTimeout(typingTimeout);
                    const timeoutId = setTimeout(() => {
                      // Perform action after typing has stopped
                      setShowAutocompleteBox(true);
                      setSourceUrl(e.target.value);
                      console.log("Typing has stopped:", e.target.value);
                    }, 500); // Adjust the timeout duration as needed
                    // Store the timeout ID for future reference
                    setTypingTimeout(timeoutId);
                  }}
                />
                {showAutocompleteBox && sourceUrl.length > 0 && (
                  <ul className="suggestions" id="suggestions">
                    {AutocompleteList?.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={() => {
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
