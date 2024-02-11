import React from "react";
import { Button } from "react-bootstrap";
import { GreenWindow } from "../Components/GreenWindow";

export const GreenWindowButton = ({
    showGreenWindow,
    setShowGreenWindow,
    isButtonDisabled,
    userAddedList,
    activatedTabData,
    isLtr,
    mqttConnected,
    setMqttConnected
}) => {
    // isButtonDisabled = false; //For testing
    //Connect and push the slide content
    publishSlideToMQTT(showGreenWindow, isButtonDisabled, mqttConnected, setMqttConnected);
    return (
        <>
            <button
                style={isButtonDisabled ? styles.cursorNotAllowed : {}}
                onClick={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow, isButtonDisabled, setMqttConnected)}
                className={getButtonClassName(showGreenWindow, isButtonDisabled)}
                title={isButtonDisabled ? "Please select a Bookmark" : ""} >
                Open Green Screen
            </button>
            {
                !isButtonDisabled && showGreenWindow &&
                <GreenWindow
                    closeWinUnloadingRef={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)}>
                    <div className="green-part-cont" style={styles.greenPartContainer}>
                        <h1>Green Screen:</h1>
                        <p>WIP</p>
                        <button
                            onClick={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow, isButtonDisabled)} >
                            Close
                        </button>
                    </div>
                    <div className="slide-part-cont" style={getDirectionStyle(styles.slidePartContainer, isLtr)}>
                        {getActivatedData(userAddedList, activatedTabData)}
                    </div>
                </GreenWindow>
            }
        </>
    );
};

function getButtonClassName(showGreenWindow, isButtonDisabled) {
    var className = showGreenWindow ?
        "btn btn-success" :
        "btn btn-tr fw-bold text-success";

    if (isButtonDisabled) {
        className += " opacity-50 cursor-na"
    }

    return className;
}

function closeGreenWindowHandling(setShowGreenWindow, showGreenWindow, isButtonDisabled, setMqttConnected) {
    if (!isButtonDisabled) {
        setShowGreenWindow(!showGreenWindow);
        closeConnectionToMQTT(setMqttConnected);
    }
}

function getDirectionStyle(srcStyles, isLtr) {
    if (!isLtr) {
        const cloneSrcStyles = { ...srcStyles };
        cloneSrcStyles.direction = "rtl";
        cloneSrcStyles["text-align"] = "rigth";
        return cloneSrcStyles;
    }

    return srcStyles;
}

const styles = {
    greenPartContainer: {
        backgroundColor: "green",
        height: "260px"
    },
    slidePartContainer: {
        height: "105px",
        "ont-family": "Roboto",
        "font-style": "normal",
        "font-weight": "600",
        "font-size": "25px",
        "line-height": "24px",
        "letter-spacing": "0.0595px",
        "color": "#212121",
        "text-align": "left",
        direction: "ltr",
        padding: "10px 10px 10px 10px",
    },
    cursorNotAllowed: {
        cursor: "not-allowed"
    }
};

function getActivatedData(userAddedList, activatedTabData) {
    if (userAddedList?.slides?.length > 0) {
        let activeSlideText;
        const activeSlideOrderNum = activatedTabData - 1;

        for (let i = 0; i < userAddedList.slides.length; i++) {
            const lupSlide = userAddedList.slides[i];

            if (lupSlide.order_number == activeSlideOrderNum) {
                activeSlideText = lupSlide.slide
                break;
            }
        }

        return activeSlideText
    }
}

// function getSlideContextTest() {
//     return <div>
//         זאת אומרת, שאם הקב"ה יתן לו זה, שתהיה לו היכולת לבטל את רשותו
//         ולהיבטל לרשותו של הקב"ה, שהוא רוצה, שתהיה רק רשות היחיד בעולם,
//         היינו רשותו של הקב"ה, שזו כל ישועתו, זה נקרא שיש לו כלי וצורך
//         שהקב"ה יעזור לו.
//     </div>
// }

function openConnectionToMQTT(setMqttConnected) {
    setMqttConnected(true);
}

function closeConnectionToMQTT(setMqttConnected) {
    setMqttConnected(false);
}

function publishSlideToMQTT(showGreenWindow, isButtonDisabled, mqttConnected, setMqttConnected) {
    if (isButtonDisabled && showGreenWindow && !mqttConnected) {
        //Open Connection here
        openConnectionToMQTT(setMqttConnected);
    }
    else {
        //Send Message here
        const temp = mqttConnected;
    }
}
