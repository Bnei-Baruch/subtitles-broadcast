import React, { useState, useEffect } from "react";
import "./PagesCSS/Newslide.css";
import Select from "react-select";
import SlideSplit from "../Utils/SlideSplit";
import { GetSlideLanguages, SetCustomSlideBySource } from "../Redux/NewSlide/NewSlide";
import { useDispatch } from "react-redux";
import { useNavigate } from 'react-router-dom';

const NewSlides = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
  const languages = {
    'English': 'en',
    'Spanish': 'es',
    'Hebrew': 'he',
    'Russian': 'ru'
  };

  const [tagList, setTagList] = useState([]);
  const [updateTagList, setUpdateTagList] = useState([]);
  const [contentSource, setContentSource] = useState('');
  const [slideLanguageOptions, setSlideLanguageOptions] = useState([]);
  const [fileUid, setFileUid] = useState('');
  const [sourceUid, setSourceUid] = useState('');
  const [activeButton, setActiveButton] = useState("button1");
  const [isChecked, setIsChecked] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, []);

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
        slides: updateTagList
      }
      if (document.getElementById('upload_name') && document.getElementById('upload_name').value.length > 0) {
        request.name = document.getElementById('upload_name').value;
      }
      if (document.getElementById('languageSelect') && slideLanguageOptions.length > 0) {
        request.languages = slideLanguageOptions;
      }
      if (activeButton === "button1") {
        setTimeout(() => {
          setProgress(75);
        }, 600);
      }
      const responsePromise = new Promise((resolve, reject) => {
        try {
          const response = dispatch(SetCustomSlideBySource(request));
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
      responsePromise.then(result => {
        if (result.payload.success) {
          setUpdateTagList([]);
          if (activeButton === "button1") {
            setTimeout(() => {
              setProgress(100);
            }, 600);
            setTimeout(() => {
              alert(result.payload.description);
              navigate('/archive');
            }, 1500);
          } else {
            alert(result.payload.description);
            navigate('/archive');
          }
        }
      }).catch(error => {
        console.error("Error occurred:", error); // Handle any errors during promise execution
      });
    };

    if (updateTagList.length > 0) {
      fetchData();
    }
  }, [updateTagList]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0].name);
  };

  const handleCheckboxChange = (e) => {
    setIsChecked(e.target.checked);
  };

  const getKeyByValue = (object, value) => {
    return Object.keys(object).find(key => object[key] === value);
  };

  const handleClick = (button) => {
    setActiveButton(button);
    // Add logic here to handle button click events
  };

  const handleInputChange = (e) => {
    setContentSource(e.target.value);
  };

  const handleUpload = () => {
    const fetchData = async (fileUid) => {
      try {
        const response = await fetch(`https://kabbalahmedia.info/assets/api/doc2html/${fileUid}`);
        if (response.status !== 200) {
          throw new Error(`Fetch failed with status ${response.status}`);
        }
        const contentData = await response.text();
        await loadSlides(contentData);
      } catch (error) {
        console.error('Error fetching or parsing data:', error.message);
      }
    };

    // Perform upload logic with selectedFile
    let sourceUid = "tswzgnWk";
    let fileUid = "OzSCqHYF";
    setSourceUid("upload_" + sourceUid);
    setFileUid("upload_" + fileUid);
    if (selectedFile) {
      // const reader = new FileReader();

      // reader.onload = (event) => {
      //   const fileContents = event.target.result;
      //   // Do something with the file contents
      //   console.log('File contents:', fileContents);
      // };

      // // Read the file as text
      // reader.readAsText(selectedFile);
      fetchData(fileUid);
    } else {
      console.error('No file selected');
    }
  };

  const loadSlides = async (sourceData) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceData, 'text/html');
    // Extract text content from tags, for example, from all paragraphs
    const contentElements = doc.querySelectorAll('h1,p');
    const paragraphArray = Array.from(contentElements).map(element => ({
      tag: element.tagName,
      content: element.outerHTML,
    }));;
    setProgress(25);
    setTimeout(() => {
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
    }, 600);
  };

  const loadSource = () => {
    let sourceUrl = `${contentSource}`;
    const fetchData = async () => {
      try {
        // get fileuid from source
        if (urlRegex.test(sourceUrl) && sourceUrl.includes("kabbalahmedia.info/backend/content_units")) {
          const url = new URL(sourceUrl);
          const params = new URLSearchParams(url.search);
          if (!params.has("id")) {
            throw new Error(`Fetch failed from source url misses id query`);
          }
          setSourceUid("upload_" + params.get("id"));
        } else {
          sourceUrl = `https://kabbalahmedia.info/backend/content_units?id=${contentSource}&with_files=true`;
          setSourceUid("upload_" + contentSource);
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
        setFileUid("upload_" + fileUid);
        // get contents from fileuid
        const response = await fetch(`https://kabbalahmedia.info/assets/api/doc2html/${fileUid}`);
        if (response.status !== 200) {
          throw new Error(`Fetch failed with status ${response.status}`);
        }
        const contentData = await response.text();
        await loadSlides(contentData);
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
              <label className="custom-checkbox">
                <input type="checkbox"
                  checked={isChecked}
                  onChange={handleCheckboxChange} />
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
                    ? slideLanguageOptions.map(slideLanguage => ({
                      label: getKeyByValue(languages, slideLanguage),
                      value: slideLanguage
                    }))
                    : [{ label: localStorage.getItem("subtitleLanguage"), value: languages[localStorage.getItem("subtitleLanguage")] }] // Add this option when isChecked is false
                }
              />
            </div>
          </div>
          <div className="input-box ">
            <label className="w-100">Name</label>
            <input className="form-control" type="type" id="upload_name" />
          </div>

          <div className="row m-4">
            <input type="file" onChange={handleFileChange} />
            <button className="btn btn-light rounded-pill col-4"
              onClick={handleUpload}>Upload File
            </button>
            <div className="file-upload-preview col-7">
              <div className="d-flex justify-content-between">
                <span className=""> File Name: {selectedFile}</span>
              </div>
              <div className="progress">
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-label="Basic example"
                  style={{ width: `${progress}%` }}
                  aria-valuenow="50"
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
                <div>
                  <SlideSplit tags={tagList} visible={false} updateSplitTags={setUpdateTagList} />
                </div>
              </div>
            </div>
          </div>
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
            <button className="btn btn-primary btn-sm col-3 m-4" onClick={loadSource}>Add Source</button>
            <div>
              <SlideSplit tags={tagList} visible={false} updateSplitTags={setUpdateTagList} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NewSlides;
