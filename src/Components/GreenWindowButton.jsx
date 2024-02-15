import React from "react";
import { GreenWindow } from "../Components/GreenWindow";
import parse from 'html-react-parser';

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
    setShowGreenWindow(!showGreenWindow);
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

function parseMqttMessage(mqttMessage) {
    if (mqttMessage) {
        try {
            let msgJson = JSON.parse(mqttMessage);

            if (msgJson.slide) {
                return parse(msgJson.slide);
            }
        } catch (e) {
            //
        }

        return mqttMessage;
    }
}

export const GreenWindowButton = ({
    showGreenWindow,
    setShowGreenWindow,
    isButtonDisabled,
    userAddedList,
    activatedTabData,
    isLtr,
    mqttConnected,
    setMqttConnected,
    mqttMessage,
    setMqttMessage,
    broadcastProgramm,
    broadcastLang
}) => {
    return (
        <>
            <button
                onClick={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow, isButtonDisabled, setMqttConnected)}
                className={getButtonClassName(showGreenWindow, isButtonDisabled)}
            >
                Open Green Screen
            </button>
            {
                !isButtonDisabled && showGreenWindow &&
                <GreenWindow
                    closeWinUnloadingRef={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)}>
                    <div className="green-part-cont" style={styles.greenPartContainer}>
                    </div>
                    <div className="slide-part-cont" style={getDirectionStyle(styles.slidePartContainer, isLtr)}>
                        {parseMqttMessage(mqttMessage)}
                    </div>
                </GreenWindow>
            }
        </>
    );
};

export default GreenWindowButton;
