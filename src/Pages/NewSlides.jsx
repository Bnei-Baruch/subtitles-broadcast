import React, { useState, useEffect } from "react";
import "./PagesCSS/Newslide.css";
import Select from "react-select";
import SlideSplit from "../Utils/SlideSplit";
import {
  ArchiveAutoComplete,
  GetAllArchiveData,
  getAutocompleteSuggetion,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useDispatch, useSelector } from "react-redux";
import useDebounce from "../Services/useDebounce";

const NewSlides = () => {
  const dispatch = useDispatch();
  const [tagList, setTagList] = useState([]);
  //const [updateTagList, setUpdateTagList] = useState([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [showAutocompleteBox, setShowAutocompleteBox] = useState(false);
  const ActocompleteList = useSelector(getAutocompleteSuggetion);
  const [activeButton, setActiveButton] = useState("button1");
  const DebouncingFreeText = useDebounce(sourceUrl, 500);
  const handleClick = (button) => {
    setActiveButton(button);
    // Add logic here to handle button click events
  };

  useEffect(() => {
    dispatch(ArchiveAutoComplete({ query: sourceUrl }));
  }, [DebouncingFreeText]);

  const loadSlides = () => {
    const docUrl = `${sourceUrl}`;
    const parser = new DOMParser();
    const fetchData = async () => {
      try {
        const response = await fetch(docUrl);
        if (response.status !== 200) {
          throw new Error(`Fetch failed with status ${response.status}`);
        }
        const data = await response.text();
        const doc = parser.parseFromString(data, "text/html");
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
            activeButton === "button1"
              ? "active-button col-6"
              : "inactive-button col-6"
          }
          onClick={() => handleClick("button1")}
        >
          Custom
        </button>
        <button
          className={
            activeButton === "button2"
              ? "active-button col-6"
              : "inactive-button col-6"
          }
          onClick={() => handleClick("button2")}
        >
          From KabbalahMedia
        </button>
      </div>
      {activeButton === "button1" ? (
        <>
          <div className="row m-4">
            <div className="input-box col-3 ">
              <label className="w-100">Multilingual</label>
              <label class="custom-checkbox">
                <input type="checkbox" />
                <span class="checkmark"></span>
              </label>
            </div>
            <div className="input-box col-7">
              <label>Languages</label>

              <Select
                isMulti
                options={[
                  { label: "dfgdf1", value: "shbsdchh1" },
                  { label: "dfgdf2", value: "shbsdchh2" },
                  { label: "dfgdf3", value: "shbsdchh3" },
                ]}
              />
            </div>
          </div>
          <div className="input-box ">
            <label className="w-100">Name</label>

            <input className="form-control" type="type" />
          </div>

          <div className="row m-4">
            <button type="button" class="btn btn-light rounded-pill col-4">
              <i class="bi bi-plus-lg mr-2"></i> Upload File
            </button>
            <div className="file-upload-preview col-7">
              <div className="d-flex justify-content-between">
                <span className=""> File Name: XYZ</span>
                <i className="bi bi-x" />
              </div>
              <div class="progress">
                <div
                  class="progress-bar"
                  role="progressbar"
                  aria-label="Basic example"
                  style={{ width: "50%" }}
                  aria-valuenow="50"
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm col-3 m-4">Add</button>
        </>
      ) : (
        <>
          <div className="row m-4">
            <label>Language</label>
            <p>English</p>
            <label className="w-100">Source Path</label>
            <div className="form-group  autoComplete">
              <input
                className="form-control"
                type="type"
                value={sourceUrl}
                onBlur={() => setShowAutocompleteBox(false)}
                onKeyDown={(e) => {
                  e.key === "Enter" &&
                    dispatch(
                      GetAllArchiveData({
                        language: "en",

                        keyword: sourceUrl,
                      })
                    );
                }}
                onChange={(e) => {
                  setShowAutocompleteBox(true);
                  setSourceUrl(e.target.value);
                }}
              />
              {showAutocompleteBox && (
                <ul class="suggestions" id="suggestions">
                  {ActocompleteList?.map((suggestion, index) => (
                    <li
                    // key={index}
                    // onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion.source_value}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              className="btn btn-primary btn-sm col-3 m-4"
              onClick={loadSlides}
            >
              Add
            </button>
            <div>
              <SlideSplit tags={tagList} visible={true} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NewSlides;
