import React, { useRef, useCallback, useEffect, useState } from "react";
import useDebounce from "../Services/useDebounce";

export const Search = ({search, searchChanged}) => {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceSearch = useDebounce(localSearch, 500 /*ms*/);
  const inputRef = useRef();

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    searchChanged(debounceSearch);
  }, [debounceSearch, searchChanged]);

  const handleKeyPress = useCallback((e) => {
    if (e.ctrlKey && e.code === 'KeyF') {
      e.preventDefault();
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // add event listener when the component mounts
    window.addEventListener("keydown", handleKeyPress);

    // remove event listener when the component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <>
      <div className="form-group col-3 autoComplete">
				<input
          ref={inputRef}
					placeholder="Search"
					value={localSearch}
					onChange={(e) => setLocalSearch(e.target.value)}
					type="text"
					className="form-control input"
				/>
      </div>
    </>
  );
};
