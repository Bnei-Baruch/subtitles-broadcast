import React from "react";
import mqtt from 'mqtt';

let mqttClientId;
let mqttClient;
let mqttTopic;


function parseMqttMessage(mqttMessage) {
    if (mqttMessage) {
        try {
            let msgJson = JSON.parse(mqttMessage);

            return msgJson;
        } catch (e) {
            //
        }

        return mqttMessage;
    }
}

const mqttPublish = (msgText, mqttClient, setMqttMessage) => {
    if (mqttClient && mqttTopic) {
        mqttClient.publish(mqttTopic, msgText, { label: '0', value: 0 }, error => {
            if (error) {
                console.log("Publish error:", error);
            }
            else {
                setMqttMessage(msgText);
            }
        });
    }
    else {
        console.log("Can't publish Active slide, the  mqttClient is not defined");
    }
}

function findActiveSlide(userAddedList, activeSlideOrderNum) {
    let retSlide;

    for (let i = 0; i < userAddedList.slides.length; i++) {
        const lupSlide = userAddedList.slides[i];

        if (lupSlide.order_number == activeSlideOrderNum) {
            retSlide = lupSlide;
            break;
        }
    }

    return retSlide;
}

function initMqttClient(broadcastProgrammCode, broadcastLangCode,
    mqttClient, setMqttClient, setJobMqttMessage) {
    if (!mqttClient) {
        mqttClientId = "kab_subtitles_" + Math.random().toString(16).substring(2, 8)
        const mqttUrl = process.env.REACT_APP_MQTT_URL;
        const mqttProtocol = process.env.REACT_APP_MQTT_PROTOCOL;
        const mqttPort = process.env.REACT_APP_MQTT_PORT;
        const mqttPath = process.env.REACT_APP_MQTT_PATH;

        const mqttOptions = { protocol: mqttProtocol, clientId: mqttClientId };
        const mqttBrokerUrl = `${mqttProtocol}://${mqttUrl}:${mqttPort}/${mqttPath}`

        mqttClient = mqtt.connect(mqttBrokerUrl, mqttOptions);

        mqttTopic = "subtitles_" + broadcastProgrammCode + "_" + broadcastLangCode;
        mqttClient.subscribe(mqttTopic);

        setMqttClient(mqttClient);
    }

    subscribeMqttMessage(mqttClient, setJobMqttMessage)

    return mqttClient;
}

function subscribeMqttMessage(mqttClient, setJobMqttMessage) {
    if (mqttClient) {
        mqttClient.on('message', function (topic, message) {
            setJobMqttMessage(message);
        });
    }
}

const determinePublishJobMsg = (userAddedList, setActivatedTab, setMqttMessage, jobMqttMessage) => {
    let isSentMsg = false;

    if (jobMqttMessage && !jobMqttMessage.isParsed) {
        const jobMessageJson = parseMqttMessage(jobMqttMessage);

        if (mqttClientId !== jobMessageJson.clientId) {
            if (userAddedList) {
                const activeSlide = findActiveSlide(userAddedList, jobMessageJson.order_number);

                if (activeSlide.source_uid === jobMqttMessage.source_uid) {
                    isSentMsg = true;

                    if (activeSlide.order_number !== jobMqttMessage.order_number) {
                        localStorage.setItem("activeSlideFileUid", activeSlide.order_number);
                        setActivatedTab(activeSlide.order_number);
                    }
                }
            }
            else {
                isSentMsg = true;
            }

            if (isSentMsg) {
                jobMessageJson.isParsed = true;
                setMqttMessage(jobMessageJson);
            }
        }
    }

    return isSentMsg;
}

const determinePublishActiveSlide = (userAddedList, activatedTabData,
    mqttClient, mqttMessage, setMqttMessage) => {

    const mqttMessageJson = parseMqttMessage(mqttMessage);
    const activeSlideOrderNum = activatedTabData - 1;

    if (!mqttMessageJson
        || (!mqttMessageJson.isParsed
            && mqttMessageJson.order_number != activeSlideOrderNum)) {

        const activeSlide = findActiveSlide(userAddedList, activeSlideOrderNum);

        if (activeSlide) {
            var jsonMsgStr = JSON.stringify({
                ID: activeSlide.ID, bookmark_id: activeSlide.bookmark_id,
                file_uid: activeSlide.file_uid, order_number: activeSlide.order_number,
                slide: activeSlide.slide, source_uid: activeSlide.source_uid, clientId: mqttClientId
            });

            mqttPublish(jsonMsgStr, mqttClient, setMqttMessage);
        }
    }
}

const determinePublish = (userAddedList, activatedTabData, setActivatedTab,
    mqttClient, mqttMessage, setMqttMessage, jobMqttMessage) => {

    let isPublished = determinePublishJobMsg(userAddedList, setActivatedTab, setMqttMessage, jobMqttMessage);

    if (!isPublished) {
        determinePublishActiveSlide(userAddedList, activatedTabData,
            mqttClient, mqttMessage, setMqttMessage);
    }
}

export function ActiveSlideMessaging({
    broadcastProgrammCode,
    broadcastLangCode,
    userAddedList,
    activatedTabData,
    setActivatedTab,
    mqttClient,
    setMqttClient,
    mqttMessage,
    setMqttMessage,
    jobMqttMessage,
    setJobMqttMessage
}) {

    initMqttClient(broadcastProgrammCode, broadcastLangCode,
        mqttClient, setMqttClient, setJobMqttMessage);

    determinePublish(userAddedList, activatedTabData, setActivatedTab,
        mqttClient, mqttMessage, setMqttMessage, jobMqttMessage);

    return (
        <div style={{ display: "none" }}></div>
    );
};

export default ActiveSlideMessaging;
