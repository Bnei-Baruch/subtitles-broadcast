import React from "react";
import mqtt from 'mqtt';

let mqttClientId;
let mqttClient;
let mqttTopic;

function initMqttClient(mqttClient, setMesServerConnectedRef,
    broadcastProgrammCode, broadcastLangCode, setMqttMessage) {
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

        setMesServerConnectedRef(mqttClient);
    }

    if (mqttClient) {
        mqttClient.on('message', function (topic, message) {
            const mqttMessage = message.toString();
            let msgJson = JSON.parse(mqttMessage);

            if (mqttClientId !== msgJson.clientId) {
                setMqttMessage(message);
            }

            console.log(msgJson);
            //client.end();
        });
    }

    return mqttClient;
}

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

const determinePublish = (userAddedList, activatedTabData, mqttClient, mqttMessage, setMqttMessage) => {
    if (userAddedList?.slides?.length > 0) {
        const mqttMessageJson = parseMqttMessage(mqttMessage);
        const activeSlideOrderNum = activatedTabData - 1;

        if (!mqttMessageJson || mqttMessageJson.order_number != activeSlideOrderNum) {
            let activeSlideText;

            for (let i = 0; i < userAddedList.slides.length; i++) {
                const lupSlide = userAddedList.slides[i];

                if (lupSlide.order_number == activeSlideOrderNum) {
                    activeSlideText = lupSlide.slide;
                    var jsonMsgStr = JSON.stringify({
                        ID: lupSlide.ID,
                        bookmark_id: lupSlide.bookmark_id,
                        file_uid: lupSlide.file_uid,
                        order_number: lupSlide.order_number,
                        slide: lupSlide.slide,
                        source_uid: lupSlide.source_uid,
                        clientId: mqttClientId
                    });
                    mqttPublish(jsonMsgStr, mqttClient, setMqttMessage)
                    break;
                }
            }
        }
    }
}

export function ActiveSlideMessaging({
    userAddedList,
    activatedTabData,
    mqttMessage,
    setMqttMessage,
    broadcastProgrammCode,
    broadcastLangCode,
    mqttClientRef,
    setMesServerConnectedRef
}) {
    initMqttClient(mqttClientRef, setMesServerConnectedRef, broadcastProgrammCode, broadcastLangCode, setMqttMessage);
    determinePublish(userAddedList, activatedTabData, mqttClientRef, mqttMessage, setMqttMessage);

    return (
        <div style={{ display: "none" }}></div>
    );
};

export default ActiveSlideMessaging;
