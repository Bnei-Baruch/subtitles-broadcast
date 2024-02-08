import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
//import { copyStyles } from "../Utils/copy-styles";

export const GreenWindow = ({ children, closeWinUnloadingRef }) => {
    const externalWindow = useRef(
        window.open("", "", "width=720,height=410,left=200,top=200")
    );

    const containerEl = document.createElement("div");
    containerEl.classList.add("green-screen-cont");
    containerEl.setAttribute("style", "height: 100%;");

    useEffect(() => {
        const currentWindow = externalWindow.current;
        return () => currentWindow.close();
    }, []);

    externalWindow.current.document.title = "Green screen window";
    externalWindow.current.document.body.appendChild(containerEl);
    //copyStyles(document, externalWindow.current.document);

    externalWindow.current.addEventListener("beforeunload", () => {
        closeWinUnloadingRef();
    });

    return ReactDOM.createPortal(children, containerEl);
};
