import React, { useState } from "react";
import "./PagesCSS/Newslide.css";
import Select from "react-select";
import SlideSplit from "../Utils/SlideSplit";
import { SetSlideLanguages } from "../Redux/NewSlide/NewSlide";
import { useDispatch } from "react-redux";

const NewSlides = () => {
  const dispatch = useDispatch();
  const languages = {
    'English': 'en',
    'Spanish': 'es',
    'Hebrew': 'he',
    'Russian': 'ru'
  };
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;

  const [tagList, setTagList] = useState([]);
  const [updateTagList, setUpdateTagList] = useState([]);
  const [contentSource, setContentSource] = useState('');
  //const [fileUid, setFileUid] = useState('');
  //const [sourceUid, setSourceUid] = useState('');

  const [activeButton, setActiveButton] = useState("button1");

  const handleClick = (button) => {
    setActiveButton(button);
    // Add logic here to handle button click events
  };

  const handleInputChange = (e) => {
    setContentSource(e.target.value);
  };

  const AddSlides = (slideList) => {
    dispatch(
      SetSlideLanguages({
        languages: languages[[localStorage.getItem("subtitleLanguage")]],
        // source_uid: sourceUid,
        // file_uid: fileUid,
        slides: slideList,
      })
    );
  }

  const loadSlides = () => {
    let sourceUrl = `${contentSource}`;
    const parser = new DOMParser();
    const fetchData = async () => {
      try {
        // get fileuid from source
        if (urlRegex.test(sourceUrl) && sourceUrl.includes("kabbalahmedia.info/backend/content_units")) {
          const url = new URL(sourceUrl);
          const params = new URLSearchParams(url.search);
          if (!params.has("id")) {
            throw new Error(`Fetch failed from source url misses id query`);
          }
          //setSourceUid(params.get("id"));
        } else {
          sourceUrl = `https://kabbalahmedia.info/backend/content_units?id=${contentSource}&with_files=true`;
          //setSourceUid(contentSource);
        }
        const sourceResponse = await fetch(sourceUrl);
        if (sourceResponse.status !== 200) {
          throw new Error(`Fetch failed with status ${sourceResponse.status}`);
        }
        const sourceData = await sourceResponse.json();
        let fileUid;
        if (sourceData.hasOwnProperty('content_units')) {
          const contentUnits = sourceData['content_units'];
          contentUnits.forEach(contentUnit => {
            if (contentUnit.hasOwnProperty('files')) {
              const files = contentUnit['files'];
              files.forEach(file => {
                if (languages[localStorage.getItem("subtitleLanguage")] === file['language']) {
                  fileUid = file['id']
                }
              });
            }
          });
        }
        //setFileUid(fileUid);
        // get contents from fileuid
        const response = await fetch(`https://kabbalahmedia.info/assets/api/doc2html/${fileUid}`);
        if (response.status !== 200) {
          throw new Error(`Fetch failed with status ${response.status}`);
        }
        const data = await response.text();
        const doc = parser.parseFromString(data, 'text/html');
        // Extract text content from tags, for example, from all paragraphs
        const contentElements = doc.querySelectorAll('h1,p');
        const paragraphArray = Array.from(contentElements).map(element => ({
          tag: element.tagName,
          content: element.outerHTML,
        }));;
        let tags = [];
        paragraphArray.forEach(elementInfo => {
          const tagName = elementInfo.tag;
          const wordArray = elementInfo.content.replace(/<[^>]*>/g, '').replace(/\n/g, '').trim().split('  ').join(' ').split(/(\s+)/);
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
        console.error('Error fetching or parsing data:', error.message);
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
            <p>{localStorage.getItem("subtitleLanguage")}</p>
            <div className="input-box ">
              <label className="w-100">Source Path</label>

              <input className="form-control" type="type" value={contentSource} onChange={handleInputChange} />
            </div>
            <button className="btn btn-primary btn-sm col-3 m-4" onClick={loadSlides}>Load Source</button>
            <div>
              <SlideSplit tags={tagList} visible={true} updateSplitTags={setUpdateTagList} />
            </div>
            <button className="btn btn-primary btn-sm col-3 m-4" onClick={() => AddSlides(updateTagList)}>Add Source</button>
          </div>
        </>
      )}
    </div>
  );
};

export default NewSlides;
