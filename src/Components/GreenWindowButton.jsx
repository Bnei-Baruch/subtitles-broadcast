import React from "react";
import { Button } from "react-bootstrap";
import { GreenWindow } from "../Components/GreenWindow";

export const GreenWindowButton = ({
    showGreenWindow,
    setShowGreenWindow,
    isButtonDisabled
}) => {
    return (
        <>
            <button
                //onClick={() => isButtonDisabled ? void (0) : setShowGreenWindow(!showGreenWindow)}
                onClick={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)}
                className={getButtonClassName(showGreenWindow)}
                title={isButtonDisabled ? "Please select a Bookmark and active slide" : ""}>
                Open Green Screen
            </button>
            {
                showGreenWindow &&
                <GreenWindow
                    closeGreenWindowHandling={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)}>
                    <div className="green-part-cont" style={styles.greenPartContainer}>
                        <h1>Green Screen:</h1>
                        <p>WIP</p>
                        <button
                            onClick={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)} >
                            Close
                        </button>
                    </div>
                    <div className="slide-part-cont" style={styles.slidePartContainer}>
                        זאת אומרת, שאם הקב"ה יתן לו זה, שתהיה לו היכולת לבטל את רשותו
                        ולהיבטל לרשותו של הקב"ה, שהוא רוצה, שתהיה רק רשות היחיד בעולם,
                        היינו רשותו של הקב"ה, שזו כל ישועתו, זה נקרא שיש לו כלי וצורך
                        שהקב"ה יעזור לו.
                    </div>
                </GreenWindow>
            }
        </>
    );
};

function getButtonClassName(showGreenWindow) {
    return showGreenWindow ?
        "btn btn-success" :
        "btn btn-tr fw-bold text-success";
}

function closeGreenWindowHandling(setShowGreenWindow, showGreenWindow) {
    setShowGreenWindow(!showGreenWindow);
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
        direction: "rtl",
        padding: "10px 10px 10px 10px",
        // "margin-bottom": "10px"
    },
};

