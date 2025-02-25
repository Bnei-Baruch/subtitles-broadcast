import { useEffect, useRef } from "react";
import mqtt from "mqtt";
import { useDispatch, useSelector } from "react-redux";
import {
  setConnected,
  updateMqttTopic,
  removeMqttTopic,
  mqttMessageReceived,
  setSubtitlesDisplayModeFromMQTT,
  setClientId,
  addMqttError,
} from "../Redux/MQTT/mqttSlice";
import { broadcastLanguages } from "../Utils/Const";
import {
  getSubtitleMqttTopic,
  getQuestionMqttTopic,
  getSubtitlesDisplayModeTopic,
} from "../Utils/Common";
import { subscribeEvent } from "../Utils/Events";
import debugLog from "../Utils/debugLog";
import { store } from "../Redux/Store";

const mqttUrl = process.env.REACT_APP_MQTT_URL;
const mqttProtocol = process.env.REACT_APP_MQTT_PROTOCOL;
const mqttPort = process.env.REACT_APP_MQTT_PORT;
const mqttPath = process.env.REACT_APP_MQTT_PATH;
const mqttBrokerUrl = `${mqttProtocol}://${mqttUrl}:${mqttPort}/${mqttPath}`;

export default function useMqtt() {
  const clientRef = useRef(null);
  const clientIdRef = useRef(null);
  const dispatch = useDispatch();
  const mqttTopics = useSelector((state) => state.mqtt.mqttTopics);

  const username = useSelector(
    (state) => state.UserProfile.userProfile.profile.username
  );

  const firstName = useSelector(
    (state) => state.UserProfile.userProfile.profile.firstName
  );

  const lastName = useSelector(
    (state) => state.UserProfile.userProfile.profile.lastName
  );

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );

  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson"
  );

  let clientId = useSelector((state) => state.mqtt.clientId);
  if (!clientId) {
    clientId = `kab_subtitles_${Math.random().toString(16).substr(2, 8)}`;
    dispatch(setClientId(clientId));
  } else {
    clientIdRef.current = clientId;
  }

  useEffect(() => {
    if (!clientRef.current) {
      debugLog("🔵 Connecting to MQTT Broker...");
      clientRef.current = mqtt.connect(mqttBrokerUrl);

      clientRef.current.on("connect", () => {
        debugLog("🟢 MQTT Connected");
        dispatch(setConnected(true));

        // ✅ Populate MQTT topics for the questions and display mode
        let broadcastMqttTopics = broadcastLanguages
          .map((langItem) => {
            return [
              getQuestionMqttTopic(broadcastProgrammCode, langItem.value),
              getSubtitlesDisplayModeTopic(
                broadcastProgrammCode,
                langItem.value
              ),
              getSubtitleMqttTopic(broadcastProgrammCode, langItem.value),
            ];
          })
          .flat();

        broadcastMqttTopics.forEach((topic) => {
          dispatch(updateMqttTopic({ topic: topic, isSubscribed: false }));
        });
      });

      clientRef.current.on("message", (topic, message) => {
        debugLog("📩 MQTT Message Received:", topic, message.toString());

        dispatch(
          mqttMessageReceived({
            topic,
            message: message.toString(),
            broadcastLangCode,
            broadcastProgrammCode,
          })
        );
      });

      clientRef.current.on("error", (err) => {
        console.error("❌ MQTT Connection Error:", err);
        dispatch(addMqttError("MQTT Connection Failed. Please try again."));
        clientRef.current.end();
        dispatch(setConnected(false));
      });

      // ✅ Listen for "mqttPublush" and publish messages to MQTT
      subscribeEvent("mqttPublush", (event) => {
        let { mqttTopic, message } = event.detail;

        if (typeof message !== "object") {
          console.error("❌ MQTT Publish Error: Message must be an object");
          dispatch(
            addMqttError("❌ MQTT Publish Error: Message must be an object")
          );

          return;
        }

        // ✅ Check if the current stored message by topic has the same slide value
        const mqttMessageForTopic =
          store.getState().mqtt.mqttMessages[mqttTopic];

        if (mqttMessageForTopic?.slide === message.slide) {
          debugLog(
            "Skipping duplicate MQTT publish (same slide):",
            mqttTopic,
            message
          );
          return;
        }

        const enhancedMessage = {
          ...message,
          clientId: clientIdRef.current || "unknown_client",
          username: username || "unknown_user",
          firstName: firstName || "Unknown",
          lastName: lastName || "User",
          date: new Date().toUTCString(),
        };

        if (clientRef.current) {
          const payloadString = JSON.stringify(enhancedMessage);
          debugLog("🚀 Publishing to MQTT:", mqttTopic, payloadString);

          clientRef.current.publish(
            mqttTopic,
            payloadString,
            { retain: true },
            (err) => {
              if (err) {
                console.error("❌ MQTT Publish Error:", err);
                dispatch(addMqttError(`MQTT Publish Failed: ${err.message}`));
              } else {
                debugLog(
                  "✅ MQTT Publish Successful:",
                  mqttTopic,
                  enhancedMessage
                );
              }
            }
          );
        }
      });
    }

    return () => {
      if (clientRef.current && clientRef.current && clientRef.current.end) {
        debugLog("🔴 Disconnecting MQTT...");
        clientRef.current.end();
        clientRef.current = null;
      }

      if (clientIdRef && clientIdRef.current && clientIdRef.current.end) {
        clientIdRef.current.end();
        clientIdRef.current = null;
      }
    };
  }, [dispatch, broadcastLangCode]);

  return {
    subscribe: (topic) => {
      if (!mqttTopics[topic]?.isSubscribed) {
        clientRef.current.subscribe(topic);
        dispatch(updateMqttTopic({ topic: topic, isSubscribed: true }));
        debugLog("MQTT Subscribed to topic: ", topic);
      }
    },
    unsubscribe: (topic) => {
      clientRef.current.unsubscribe(topic);
      dispatch(updateMqttTopic({ topic: topic, isSubscribed: false }));
      debugLog("MQTT UnSubscribed to topic: ", topic);
    },
  };
}
