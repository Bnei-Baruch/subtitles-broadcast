import React from "react";
import { Button } from "react-bootstrap";
import { GreenWindow } from "../Components/GreenWindow";
import parse from 'html-react-parser';
import mqtt from 'mqtt';

const mqttOptions = { protocol: 'wss', clientId: 'kab_subtitles_' + Math.random().toString(16).substring(2, 8) };
const mqttClient = mqtt.connect('wss://broker.emqx.io:8084/mqtt', mqttOptions);

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

            if (msgJson.message) {
                return parse(msgJson.message);
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
    setMqttMessage
}) => {
    const lang = "eng";
    const brdcastProgramm = "morning_lesson";
    const mqttTopic = "subtitles_" + lang + "_" + brdcastProgramm;
    mqttClient.subscribe(mqttTopic);

    mqttClient.on('message', function (topic, message) {
        const note = message.toString();
        setMqttMessage(note);
        //console.log(note);
        //client.end();
    });

    const mqttPublish = (msgText) => {
        if (showGreenWindow && mqttClient) {
            mqttClient.publish(mqttTopic, msgText, { label: '0', value: 0 }, error => {
                if (error) {
                    console.log('Publish error: ', error);
                }
            });
        }
    }

    const determinePublish = (userAddedList, activatedTabData) => {
        if (userAddedList?.slides?.length > 0) {
            let activeSlideText;
            const activeSlideOrderNum = activatedTabData - 1;

            for (let i = 0; i < userAddedList.slides.length; i++) {
                const lupSlide = userAddedList.slides[i];

                if (lupSlide.order_number == activeSlideOrderNum) {
                    activeSlideText = lupSlide.slide;
                    var jsonMsgStr = JSON.stringify({ message: activeSlideText });
                    mqttPublish(jsonMsgStr)
                    break;
                }
            }
        }
    }

    determinePublish(userAddedList, activatedTabData);

    return (
        <>
            <button
                // style={isButtonDisabled ? styles.cursorNotAllowed : {}}
                onClick={() => closeGreenWindowHandling(setShowGreenWindow, showGreenWindow, isButtonDisabled, setMqttConnected)}
                className={getButtonClassName(showGreenWindow, isButtonDisabled)}
            // title={isButtonDisabled ? "Please select a Bookmark" : ""} 
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
