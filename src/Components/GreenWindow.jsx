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
    var docRef = externalWindow.current.document;
    var bodyElm = docRef.body;
    //bodyElm.style.marging = "0";
    var styleElm = document.createElement("style");
    styleElm.setAttribute("rel", "stylesheet");
    styleElm.setAttribute("type", "text/css");
    styleElm.appendChild(
      document.createTextNode(`
    body{
      margin: 0;
      //aspect-ratio : 16/9;
    }
    .full-screen-btn{
      position: absolute;
      top:  15px;
      right:  15px;
      background: rgba(0,0,0,0.05);
      border:  0;
      width:  60px;
      height:  60px;
      border-radius: 50%;
      box-sizing: border-box;
      transition:  transform .3s;
      cursor:  pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .full-screen-btn:hover {
        transform: scale(1.125);
    }
    .full-screen-btn svg:nth-child(2) { 
        display: none;
    }
    [fullscreen] .full-screen-btn svg:nth-child(1) {
        display: none;
    }
    [fullscreen] .full-screen-btn svg:nth-child(2) {
        display: inline-block;
    }
    .slide-container{
      height:  100%;    
    }
    .slide-content{
      #aspect-ratio : 16/2.99;
      height:  100%; 
    }
      `)
    );
    bodyElm.appendChild(styleElm);

    containerEl = document.createElement("div");
    containerEl.classList.add("green-screen-cont");
    containerEl.setAttribute("style", "height: 100%;");
    containerEl.setAttribute("id", "green_screen_cont");

    const newButton = document.createElement("button");
    newButton.setAttribute("id", "full_screen");
    newButton.className = "full-screen-btn";
    newButton.innerHTML = `
    <svg viewBox="0 0 24 24">
        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 
        7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
    </svg>
    <svg viewBox="0 0 24 24">
        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 
        11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
    </svg>
    `;
    //newButton.textContent = "Full screen";
    containerEl.appendChild(newButton);

    var s = externalWindow.current.document.createElement("script");
    s.type = "text/javascript";
    var code = `    
      document.getElementById("full_screen").addEventListener("click", function() {
        var elem = document.getElementsByTagName("html")[0];
        console.log(elem);

        if ((document.fullScreenElement !== undefined && document.fullScreenElement === null) 
          || (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) 
          || (document.mozFullScreen !== undefined && !document.mozFullScreen) 
          || (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen)) {
            if (elem.requestFullScreen) {
                elem.requestFullScreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullScreen) {
                elem.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            if (document.cancelFullScreen) {
                document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
      });
    `;
    try {
      s.appendChild(document.createTextNode(code));
      containerEl.appendChild(s);
    } catch (e) {
      s.text = code;
      containerEl.appendChild(s);
    }
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
