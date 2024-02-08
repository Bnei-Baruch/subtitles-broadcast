import React from "react";
import { Button } from "react-bootstrap";
import { GreenWindow } from "../Components/GreenWindow";

export const GreenWindowButton = ({
    showGreenWindow,
    setShowGreenWindow,
    isButtonDisabled,
    userAddedList,
    activatedTabData,
    isLtr
}) => {
    isButtonDisabled = false; //For testing
    return (
        <>
            <button
                style={isButtonDisabled ? styles.cursorNotAllowed : {}}
                onClick={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow, isButtonDisabled)}
                className={getButtonClassName(showGreenWindow, isButtonDisabled)}
                title={isButtonDisabled ? "Please select a Bookmark" : ""} >
                Open Green Screen
            </button>
            {
                !isButtonDisabled && showGreenWindow &&
                <GreenWindow
                    closeGreenWindowHandling={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)}>
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

function closeGreenWindowHandling(setShowGreenWindow, showGreenWindow, isButtonDisabled) {
    if (!isButtonDisabled) {
        setShowGreenWindow(!showGreenWindow);
    }
}

function getDirectionStyle(srcStyles, isLtr) {
    if (!isLtr) {
        const cloneSrcStyles = { ...srcStyles };
        cloneSrcStyles.direction = "ltr";
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
        "text-align": "right",
        "letter-spacing": "0.0595px",
        "color": "#212121",
        direction: "ltr",
        padding: "10px 10px 10px 10px",
        // "margin-bottom": "10px"
    },
    cursorNotAllowed: {
        cursor: "not-allowed"
    }
};

function getActivatedData(userAddedList, activatedTabData) {
    if (!userAddedList) {
        userAddedList = { slides: [{ slide: getSlideContextTest() }] }
        activatedTabData = 0
    }

    if (userAddedList?.slides?.length > 0) {
        return userAddedList?.slides[activatedTabData].slide
    }
}

function getSlideContextTest() {
    return <div>
        זאת אומרת, שאם הקב"ה יתן לו זה, שתהיה לו היכולת לבטל את רשותו
        ולהיבטל לרשותו של הקב"ה, שהוא רוצה, שתהיה רק רשות היחיד בעולם,
        היינו רשותו של הקב"ה, שזו כל ישועתו, זה נקרא שיש לו כלי וצורך
        שהקב"ה יעזור לו.
    </div>
}
