import React, { useState } from 'react';
import mqtt from 'mqtt';

let mqttClientId;
let mqttTopic;

function parseMqttMessage(mqttMessage) {
    if (mqttMessage) {
        try {
            if (typeof (mqttMessage) === "string") {
                let msgJson = JSON.parse(mqttMessage);

                return msgJson;
            }
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
        console.error("Can't publish Active slide, the  mqttClient is not defined");
    }
}

function findActiveSlide(userAddedList, activeSlideOrderNum) {
    let retSlide;

    for (let i = 0; i < userAddedList.slides.length; i++) {
        const lupSlide = userAddedList.slides[i];

        if (lupSlide.order_number === activeSlideOrderNum) {
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
        subscribeMqttMessage(mqttClient, setJobMqttMessage)
    }

    return mqttClient;
}

function subscribeMqttMessage(mqttClient, setJobMqttMessage) {
    if (mqttClient) {
        mqttClient.on('message', function (topic, message) {
            const messageStr = message.toString();
            const jobMessageJson = parseMqttMessage(messageStr);

            if (jobMessageJson.clientId !== mqttClientId) {
                setJobMqttMessage(jobMessageJson);
            }
        });
    }
}

const determinePublcJobMsg = (userAddedList, activatedTab, setActivatedTab,
    mqttMessage, setMqttMessage,
    jobMqttMessage, setJobMqttMessage) => {

    let isPublc = false;

    if (jobMqttMessage) {
        const activeSlideOrderNum = activatedTab - 1;
        const jobMessageJson = parseMqttMessage(jobMqttMessage);
        const mqttMessageJson = parseMqttMessage(mqttMessage);

        if (userAddedList) {
            if ((mqttMessageJson.order_number !== jobMessageJson.order_number
                && (!jobMqttMessage || jobMqttMessage.order_number !== mqttMessageJson.order_number))) {

                //if (userAddedList) {
                const activeSlide = findActiveSlide(userAddedList, activeSlideOrderNum);

                if (activeSlide.source_uid === jobMqttMessage.source_uid) {
                    if (activeSlide.order_number !== jobMqttMessage.order_number) {
                        setActivatedTab(jobMqttMessage.order_number + 1);
                        isPublc = true;
                    }
                }
                // }
            }
        }
        else {
            if (!mqttMessageJson || mqttMessageJson.order_number !== jobMqttMessage.order_number) {
                isPublc = true;
            }
        }

        if (isPublc) {
            const cloneJobMsgJson = { ...jobMessageJson };
            //cloneJobMsgJson.isParsed = true;
            //setJobMqttMessage(cloneJobMsgJson);
            setMqttMessage(cloneJobMsgJson);
        }
    }

    return isPublc;
}

const determinePublishActiveSlide = (userAddedList, activatedTab,
    mqttClient, mqttMessage, setMqttMessage, jobMqttMessage, setJobMqttMessage) => {

    const mqttMessageJson = parseMqttMessage(mqttMessage);
    const activeSlideOrderNum = activatedTab - 1;
    const jobMessageJson = parseMqttMessage(jobMqttMessage);

    if (userAddedList) {
        if ((!mqttMessageJson
            || (mqttMessageJson.order_number !== activeSlideOrderNum
                && (!jobMessageJson ||
                    jobMessageJson.order_number !== activeSlideOrderNum)))) {
            const activeSlide = findActiveSlide(userAddedList, activeSlideOrderNum);

            if (activeSlide
                && (!mqttMessageJson || activeSlide.order_number !== mqttMessageJson.order_number)) {
                var jsonMsgStr = JSON.stringify({
                    ID: activeSlide.ID, bookmark_id: activeSlide.bookmark_id,
                    file_uid: activeSlide.file_uid, order_number: activeSlide.order_number,
                    slide: activeSlide.slide, source_uid: activeSlide.source_uid, clientId: mqttClientId
                });

                setJobMqttMessage(null);
                mqttPublish(jsonMsgStr, mqttClient, setMqttMessage);
            }
        }
    }
}

const determinePublish = (userAddedList, activatedTab, setActivatedTab,
    mqttClient, mqttMessage, setMqttMessage, jobMqttMessage, setJobMqttMessage) => {

    let isPublished = determinePublcJobMsg(userAddedList, activatedTab, setActivatedTab,
        mqttMessage, setMqttMessage,
        jobMqttMessage, setJobMqttMessage);

    if (!isPublished) {
        determinePublishActiveSlide(userAddedList, activatedTab,
            mqttClient, mqttMessage, setMqttMessage, jobMqttMessage, setJobMqttMessage);
    }
}

export function ActiveSlideMessaging({
    broadcastProgrammCode,
    broadcastLangCode,
    userAddedList,
    activatedTab,
    setActivatedTab,
    mqttMessage,
    setMqttMessage,
    jobMqttMessage,
    setJobMqttMessage
}) {
    const [mqttClient, setMqttClient] = useState(null);

    initMqttClient(broadcastProgrammCode, broadcastLangCode,
        mqttClient, setMqttClient, setJobMqttMessage);

    determinePublish(userAddedList, activatedTab, setActivatedTab,
        mqttClient, mqttMessage, setMqttMessage, jobMqttMessage, setJobMqttMessage);

    return (
        <div style={{ display: "none" }}></div>
    );
};

export default ActiveSlideMessaging;
