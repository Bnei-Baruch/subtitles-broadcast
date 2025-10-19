import { useEffect, useRef } from "react";
import mqtt from "mqtt";
import { useDispatch, useSelector } from "react-redux";
import { setConnected, updateMqttTopic, mqttMessageReceived, setClientId, addMqttError } from "../Redux/MQTT/mqttSlice";
import { DM_NONE, ST_QUESTION, ST_SUBTITLE, broadcastLanguages } from "../Utils/Const";
import { getSubtitleMqttTopic, getQuestionMqttTopic } from "../Utils/Common";
import debugLog from "../Utils/debugLog";
import { store } from "../Redux/Store";

const mqttUrl = process.env.REACT_APP_MQTT_URL;
const mqttProtocol = process.env.REACT_APP_MQTT_PROTOCOL;
const mqttPort = process.env.REACT_APP_MQTT_PORT;
const mqttPath = process.env.REACT_APP_MQTT_PATH;
// Handle empty or falsy MQTT path - if empty, don't include the trailing slash
const mqttBrokerUrl = mqttPath && mqttPath.trim() !== '' 
  ? `${mqttProtocol}://${mqttUrl}:${mqttPort}/${mqttPath}`
  : `${mqttProtocol}://${mqttUrl}:${mqttPort}`;

export default function useMqtt() {
  const clientRef = useRef(null);
  const clientIdRef = useRef(null);
  const dispatch = useDispatch();
  const mqttTopics = useSelector((state) => state.mqtt.mqttTopics);
  const { username, firstName, lastName, token, email } = useSelector((state) => state.UserProfile.userProfile);
  const broadcastLangCode = useSelector((state) => state.userSettings.userSettings.broadcast_language_code || "he");
  const broadcastProgrammCode = useSelector((state) => state.userSettings.userSettings.broadcast_program_code || "morning_lesson"); 
  const isConnected = useSelector((state) => state.mqtt.isConnected);
  const userSettingsLoaded = useSelector((state) => state.userSettings.isLoaded);

  let clientId = useSelector((state) => state.mqtt.clientId);
  if (!clientId) {
    clientId = `kab_subtitles_${Math.random().toString(16).substr(2, 8)}`;
    dispatch(setClientId(clientId));
  } else {
    clientIdRef.current = clientId;
  }

  useEffect(() => {
    if (isConnected && userSettingsLoaded) {
      // Subscribe to all topics.
      const topics = Object.keys(mqttTopics).filter((topic) => !mqttTopics[topic]?.isSubscribed);
      if (topics.length) {
        clientRef.current.subscribe(topics, (err, granted) => {
          if (err) {
            const errMsg = `MQTT failed to subsribe to ${topics.join(',')}: ${err}`;
            console.err(errMsg);
            debugLog(errMsg);
          } else {
            for (const grant of granted) {
              dispatch(updateMqttTopic({ topic: grant.topic, isSubscribed: true }));
              debugLog("MQTT Subscribed to topic: ", grant.topic, grant.qos);
            }
          }
        });
      }
    }
  }, [dispatch, mqttTopics, isConnected, userSettingsLoaded]);

  useEffect(() => {
    if (!clientRef.current) {
      debugLog("Connecting to MQTT Broker...", mqttBrokerUrl);
      clientRef.current = mqtt.connect(mqttBrokerUrl, {
        keepalive: 60, // seconds
        reconnectPeriod: 2000, // ms

        username: email,
        password: token,

        // In disconnected state, don't queue messages, drop them.
        queueQoSZero: false,
      });

      clientRef.current.on("connect", () => {
        debugLog("MQTT Connected");
        dispatch(setConnected(true));

        // Populate MQTT topics for the questions and subtitles
        let broadcastMqttTopics = broadcastLanguages
          .map((langItem) => {
            return [
              getQuestionMqttTopic(broadcastProgrammCode, langItem.value),
              getSubtitleMqttTopic(broadcastProgrammCode, langItem.value),
            ];
          })
          .flat();

        broadcastMqttTopics.forEach((topic) => {
          dispatch(updateMqttTopic({ topic: topic, isSubscribed: false }));
        });
      });

      clientRef.current.on("message", (topic, message) => {
        debugLog("MQTT Message Received:", topic, message.toString());

        dispatch(
          mqttMessageReceived({
            topic,
            message: message.toString(),
            broadcastLangCode, 
          })
        );
      });

      clientRef.current.on("error", (err) => {
        console.error("MQTT Connection Error:", err);
        dispatch(addMqttError("MQTT Connection Failed. Please try again."));
        // We don't activelly end client session to allow reconnection.
        // Uncommenting following line will result in session not being able
        // to reconnect when netwrok is back on.
        // clientRef.current.end();
        dispatch(setConnected(false));
      });

      clientRef.current.on("reconnect", () => {
        debugLog("MQTT Reconnect");
      });
      clientRef.current.on("offline", () => {
        debugLog("MQTT offline");
        dispatch(
          addMqttError("MQTT Connection offline. Will try to reconnect.")
        );
      });
      clientRef.current.on("close", () => {
        debugLog("MQTT close");
      });
    }

    return () => {
      if (clientRef.current && clientRef.current.end) {
        debugLog("Disconnecting MQTT...");
        clientRef.current.end();
        clientRef.current = null;
      }

      if (clientIdRef && clientIdRef.current) {
        clientIdRef.current = null;
      }
    };
  }, [dispatch, broadcastLangCode, broadcastProgrammCode]);

  useEffect(() => {
    const mqttPublishHandler = (event) => {
      const { mqttTopic, message, ignoreLiveMode = false } = event.detail;
      const state = store.getState();
      const isLiveModeEnabled = state.mqtt.isLiveModeEnabled;

      if (!ignoreLiveMode && !isLiveModeEnabled) {
        debugLog("Live mode is OFF. MQTT message not published.");
        return;
      }

      if (typeof message !== "object") {
        console.error("MQTT Publish Error: Message must be an object");
        dispatch(addMqttError("MQTT Publish Error: Message must be an object"));
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
        debugLog(" Publishing to MQTT:", mqttTopic, payloadString);
        clientRef.current.publish(
          mqttTopic,
          payloadString,
          { retain: true },
          (err) => {
            if (err) {
              console.error("MQTT Publish Error:", err);
              dispatch(addMqttError(`MQTT Publish Failed: ${err.message}`));
            } else {
              debugLog(" MQTT Publish Successful:", mqttTopic, enhancedMessage);
            }
          }
        );
      }
    };

    // Add listener only once
    document.addEventListener("mqttPublish", mqttPublishHandler);

    // Remove listener on component unmount correctly.
    return () => {
      debugLog(" Removing MQTT publish listener");
      document.removeEventListener("mqttPublish", mqttPublishHandler);
    };
  }, []); // Runs only once

  // Allow unsubscribing when application closes.
  return {
    unsubscribe: () => {
      if (isConnected) {
        Object.keys(mqttTopics).forEach((topic) => {
          if (!clientRef || !clientRef.current) {
            return;
          }

          clientRef.current.unsubscribe(topic);
          dispatch(updateMqttTopic({ topic: topic, isSubscribed: false }));
          debugLog("MQTT UnSubscribed to topic: ", topic);
        });
      }
    },
  };
}

export function publishEvent(eventName, data) {
  const event = new CustomEvent(eventName, { detail: data });
  document.dispatchEvent(event);
}

export const publishDisplyNoneMqttMessage = (mqttMessages, channel, langCode) => {
  republishSubtitle(mqttMessages, channel, langCode, DM_NONE);
  republishQuestion(mqttMessages, channel, langCode, DM_NONE);
};

// Used only locally in this file, will only update question displayMode if needed.
function republishQuestion(mqttMessages, channel, langCode, displayMode, ignoreLiveMode = false) {
  const questionMqttTopic = getQuestionMqttTopic(channel, langCode);
  const lastQuestion = mqttMessages[questionMqttTopic] || {};
  if (lastQuestion.display_status !== displayMode) {
    publishMessage(lastQuestion, ST_QUESTION, questionMqttTopic, langCode, displayMode, ignoreLiveMode);
  }
}

// Used only locally in this file, will only update subtitle displayMode if needed.
function republishSubtitle(mqttMessages, channel, langCode, displayMode, ignoreLiveMode = false) {
  const subtitleMqttTopic = getSubtitleMqttTopic(channel, langCode);
  const lastSubtitle = mqttMessages[subtitleMqttTopic] || {};
  if (lastSubtitle.display_status !== displayMode) {
    publishMessage(lastSubtitle, ST_SUBTITLE, subtitleMqttTopic, langCode, displayMode, ignoreLiveMode);
  }
}

// Updates question and if needed also updated subtitle displayMode.
export function publishQuestion(question, mqttMessages, channel, langCode, displayMode, ignoreLiveMode = false) {
  const questionMqttTopic = getQuestionMqttTopic(channel, langCode);
  publishMessage(question || {}, ST_QUESTION, questionMqttTopic, langCode, displayMode, ignoreLiveMode);
  republishSubtitle(mqttMessages, channel, langCode, displayMode, ignoreLiveMode);
}

// Updates subtitle and if needed also updated question displayMode.
export function publishSubtitle(subtitle, mqttMessages, channel, langCode, displayMode, ignoreLiveMode = false) {
  const subtitleMqttTopic = getSubtitleMqttTopic(channel, langCode);
  publishMessage(subtitle || {}, ST_SUBTITLE, subtitleMqttTopic, langCode, displayMode, ignoreLiveMode);
  republishQuestion(mqttMessages, channel, langCode, displayMode, ignoreLiveMode);
}

export const publishMessage = (slide, type, topic, lang, displayMode, ignoreLiveMode) => {
  const message = {
    slide_type: slide.slide_type || type,
    // Deprecated field. Keep for external systems.
    type: slide.slide_type || type,

    ID: slide.ID,
    bookmark_id: slide.bookmark_id,
    file_uid: slide.file_uid,
    order_number: slide.order_number,
    slide: slide.slide,
    source_uid: slide.source_uid,
    isLtr: slide.isLtr !== undefined ? slide.isLtr : slide.left_to_right !== false,
    lang: lang,
    visible: slide.visible === undefined ? true : slide.visible,
    previous_slide: slide.previous_slide,

    // Important to override display mode.
    display_status: displayMode,
  };

  publishEvent("mqttPublish", { mqttTopic: topic, message: message, ignoreLiveMode });
};
