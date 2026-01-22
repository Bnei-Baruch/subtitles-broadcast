import { useEffect, useRef } from "react";
import mqtt from "mqtt";
import { useDispatch, useSelector } from "react-redux";
import { setConnected, updateMqttTopic, mqttMessageReceived, setClientId, addMqttNotification } from "../Redux/MQTT/mqttSlice";
import { DM_NONE, ST_QUESTION, ST_SUBTITLE, broadcastLanguages } from "../Utils/Const";
import { getSubtitleMqttTopic, getQuestionMqttTopic } from "../Utils/Common";
import debugLog from "../Utils/debugLog";
import { store } from "../Redux/Store";

// Periodic connection check - ensures reconnection after network outages
const CONNECTION_CHECK_INTERVAL = 15000; // 15s
const IMMEDIATE_RECONNECT_DELAY = 100; // 100ms - delay before immediate reconnect on disconnect events

const mqttUrl = process.env.REACT_APP_MQTT_URL;
const mqttProtocol = process.env.REACT_APP_MQTT_PROTOCOL;
const mqttPort = process.env.REACT_APP_MQTT_PORT;
const mqttPath = process.env.REACT_APP_MQTT_PATH;

// Debug logging to see what we're getting
debugLog("MQTT Path debug:", {
  mqttPath,
  mqttPathType: typeof mqttPath,
  mqttPathLength: mqttPath ? mqttPath.length : "undefined",
  mqttPathTrimmed: mqttPath ? mqttPath.trim() : "undefined",
  isEmpty: !mqttPath || mqttPath.trim() === "",
});

// Handle empty or falsy MQTT path - also handle literal '""' string
const isPathEmpty =
  !mqttPath ||
  mqttPath.trim() === "" ||
  mqttPath.trim() === '""' ||
  mqttPath.trim() === "''";

const mqttBrokerUrl = !isPathEmpty
  ? `${mqttProtocol}://${mqttUrl}:${mqttPort}/${mqttPath}`
  : `${mqttProtocol}://${mqttUrl}:${mqttPort}`;

debugLog("Final MQTT URL:", mqttBrokerUrl);

export default function useMqtt() {
  const clientRef = useRef(null);
  const clientIdRef = useRef(null);
  const periodicCheckIntervalRef = useRef(null);
  const isReconnectingRef = useRef(false);
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
      const topics = Object.keys(mqttTopics).filter((topic) => !mqttTopics[topic]);
      if (topics.length) {
        debugLog(`[SUBSCRIBE EFFECT] Subscribing to ${topics.length} topics:`, topics);
        clientRef.current.subscribe(topics, (err, granted) => {
          if (err) {
            const errMsg = `MQTT failed to subsribe to ${topics.join(',')}: ${err}`;
            console.error(errMsg);
            debugLog(errMsg);
          } else {
            debugLog(`[SUBSCRIBE CALLBACK] Subscription confirmed for ${granted.length} topics`);
            for (const grant of granted) {
              dispatch(updateMqttTopic({ topic: grant.topic, isSubscribed: true }));
              debugLog(`[SUBSCRIBE CALLBACK] Marked as subscribed: ${grant.topic} (QoS ${grant.qos})`);
            }
          }
        });
      } else {
        debugLog(`[SUBSCRIBE EFFECT] No unsubscribed topics to subscribe to`);
      }
    }
  }, [dispatch, mqttTopics, isConnected, userSettingsLoaded]);

  // Single reconnection function - prevents duplicate attempts
  const tryReconnect = () => {
    if (isReconnectingRef.current) {
      debugLog('[RECONNECT] Already reconnecting, skipping duplicate');
      return;
    }

    if (!clientRef.current) {
      debugLog('[RECONNECT] No client, skipping');
      return;
    }

    if (clientRef.current.connected) {
      debugLog('[RECONNECT] Already connected');
      return;
    }

    isReconnectingRef.current = true;
    debugLog('[RECONNECT] Starting reconnection attempt');
    clientRef.current.reconnect();
  };

  const startConnectionCheck = () => {
    if (periodicCheckIntervalRef.current) {
      clearInterval(periodicCheckIntervalRef.current);
    }
    periodicCheckIntervalRef.current = setInterval(tryReconnect, CONNECTION_CHECK_INTERVAL);
    debugLog('Started periodic connection check');
  };

  const stopConnectionCheck = () => {
    if (periodicCheckIntervalRef.current) {
      clearInterval(periodicCheckIntervalRef.current);
      periodicCheckIntervalRef.current = null;
    }
  };

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

      // Start connection check immediately - runs regardless of connection state
      startConnectionCheck();

      clientRef.current.on("connect", () => {
        const state = store.getState();
        const existingTopics = Object.keys(state.mqtt.mqttTopics);
        const isReconnect = existingTopics.length > 0;

        debugLog(`[CONNECT EVENT] MQTT Connected (${isReconnect ? 'RECONNECT' : 'FIRST CONNECT'})`);
        isReconnectingRef.current = false;  // Clear reconnecting flag
        dispatch(setConnected(true));

        // Show success notification on reconnect
        if (isReconnect) {
          dispatch(addMqttNotification({
            message: "MQTT reconnected successfully.",
            type: "success"
          }));
        }

        // Populate MQTT topics for the questions and subtitles
        let broadcastMqttTopics = broadcastLanguages
          .map((langItem) => {
            return [
              getQuestionMqttTopic(broadcastProgrammCode, langItem.value),
              getSubtitleMqttTopic(broadcastProgrammCode, langItem.value),
            ];
          })
          .flat();

        debugLog(`[CONNECT EVENT] Resetting ${broadcastMqttTopics.length} topics to isSubscribed=false`);
        broadcastMqttTopics.forEach((topic) => {
          dispatch(updateMqttTopic({ topic: topic, isSubscribed: false }));
        });
      });

      clientRef.current.on("message", (topic, message) => {
        const state = store.getState();
        const currentSubState = state.mqtt.mqttTopics[topic];

        debugLog(`[MESSAGE] Received on topic: ${topic} (current state: ${currentSubState})`);

        // Receiving a message proves we're subscribed (retained messages arrive immediately)
        if (currentSubState === false) {
          debugLog(`[MESSAGE] Auto-confirming subscription for ${topic} (was false, setting to true)`);
          dispatch(updateMqttTopic({ topic: topic, isSubscribed: true }));
        } else if (currentSubState === true) {
          debugLog(`[MESSAGE] Topic ${topic} already marked as subscribed`);
        } else {
          debugLog(`[MESSAGE] WARNING: Received message on unknown topic ${topic}`);
        }

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
        debugLog("[ERROR EVENT] MQTT connection error - will reconnect");
        dispatch(addMqttNotification({
          message: "MQTT Connection Failed.",
          type: "error"
        }));
        dispatch(setConnected(false));
        // Immediately try to reconnect on error
        setTimeout(() => tryReconnect(), IMMEDIATE_RECONNECT_DELAY);
      });

      clientRef.current.on("reconnect", () => {
        debugLog("[RECONNECT EVENT] MQTT attempting reconnection...");
      });

      clientRef.current.on("offline", () => {
        debugLog("[OFFLINE EVENT] MQTT went offline");
        dispatch(setConnected(false));
        dispatch(addMqttNotification({
          message: "MQTT offline. Will reconnect.",
          type: "error"
        }));
        // Immediately try to reconnect when offline
        setTimeout(() => tryReconnect(), IMMEDIATE_RECONNECT_DELAY);
      });

      clientRef.current.on("close", () => {
        debugLog("[CLOSE EVENT] MQTT connection closed");
        dispatch(setConnected(false));
        // Immediately try to reconnect on close
        setTimeout(() => tryReconnect(), IMMEDIATE_RECONNECT_DELAY);
      });
    }

    return () => {
      stopConnectionCheck();
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
        dispatch(addMqttNotification({
          message: "MQTT Publish Error: Message must be an object",
          type: "error"
        }));
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
              dispatch(addMqttNotification({
                message: `MQTT Publish Failed: ${err.message}`,
                type: "error"
              }));
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

    renderer: slide.renderer,

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
