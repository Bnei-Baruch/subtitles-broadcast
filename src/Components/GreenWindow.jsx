import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";

export const GreenWindow = ({ children, closeWinUnloadingRef }) => {
  var popupFeatures =
    "popup=1,menubar=0,toolbar=0,location=0,resizable=0,scrollbars=0,status=0,width=720,height=410,left=200,top=200";
  const externalWindow = useRef(window.open("", "green_window", popupFeatures));

  let containerEl = externalWindow
    ? externalWindow.current.document.getElementById("green_screen_cont")
    : null;

  if (!containerEl) {
    containerEl = document.createElement("div");
    containerEl.classList.add("green-screen-cont");
    containerEl.setAttribute("style", "height: 100%;");
    containerEl.setAttribute("id", "green_screen_cont");
  }

  useEffect(() => {
    const currentWindow = externalWindow.current;
    return () => currentWindow.close();
  }, []);

  externalWindow.current.document.title = "Green screen window";
  externalWindow.current.document.body.appendChild(containerEl);

  externalWindow.current.addEventListener("beforeunload", () => {
    closeWinUnloadingRef();
  });

  return ReactDOM.createPortal(children, containerEl);
};
