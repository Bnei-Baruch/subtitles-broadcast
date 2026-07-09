import { useEffect, useRef } from "react";
import mqtt from "mqtt";
import { useDispatch, useSelector } from "react-redux";
import { setConnected, updateMqttTopic, mqttMessageReceived, setClientId, addMqttNotification } from "../Redux/MQTT/mqttSlice";
import { DM_NONE, DM_KARAOKE, ST_QUESTION, ST_SUBTITLE, broadcastLanguages } from "../Utils/Const";
import { getSubtitleMqttTopic, getQuestionMqttTopic, getOnOffAirTopic, getKaraokeMqttTopic } from "../Utils/Common";
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
            debugLog(`[SUBSCRIBE CALLBACK] Requested ${topics.length}, granted ${granted.length}`);
            if (granted.length < topics.length) {
              const ok = new Set(granted.map((g) => g.topic));
              debugLog(`[SUBSCRIBE CALLBACK] WARNING: not granted:`, topics.filter((t) => !ok.has(t)));
            }
            for (const grant of granted) {
              dispatch(updateMqttTopic({ topic: grant.topic, isSubscribed: true }));
              debugLog(`[SUBSCRIBE CALLBACK] Marked as subscribed: ${grant.topic} (QoS ${grant.qos})`);
            }
          }
        });
      } else {
        debugLog(`[SUBSCRIBE EFFECT] Steady state — all ${Object.keys(mqttTopics).length} topics subscribed`);
      }
    }
  }, [dispatch, mqttTopics, isConnected, userSettingsLoaded]);

  useEffect(() => {
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

    const handleOnline = () => {
      debugLog("[NETWORK] Browser back online — forcing reconnect");
      tryReconnect();
    };
    const handleOffline = () => {
      debugLog("[NETWORK] Browser offline — marking disconnected");
      dispatch(setConnected(false));
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!clientRef.current) {
      const { email, token } = store.getState().UserProfile.userProfile;
      debugLog("Connecting to MQTT Broker...", mqttBrokerUrl);
      const client = mqtt.connect(mqttBrokerUrl, {
        keepalive: 5, // seconds — dead link detected in ~5-8s instead of 60-90s
        reconnectPeriod: 2000, // ms
        // Redux subscribe-effect is the single owner of (re)subscription.
        // mqtt.js internal resubscribe made post-reconnect subscribe() a no-op
        // (granted=[]), leaving redux topics stuck on isSubscribed=false.
        resubscribe: false,

        username: email,
        password: token,

        // In disconnected state, don't queue messages, drop them.
        queueQoSZero: false,
      });
      clientRef.current = client;

      // Start connection check immediately - runs regardless of connection state
      startConnectionCheck();

      client.on("connect", () => {
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

        // Populate MQTT topics for the questions, subtitles, and on/off air
        let broadcastMqttTopics = broadcastLanguages
          .map((langItem) => {
            return [
              getQuestionMqttTopic(broadcastProgrammCode, langItem.value),
              getSubtitleMqttTopic(broadcastProgrammCode, langItem.value),
            ];
          })
          .flat();
        broadcastMqttTopics.push(getOnOffAirTopic(broadcastProgrammCode));
        broadcastMqttTopics.push(getKaraokeMqttTopic(broadcastProgrammCode));

        debugLog(`[CONNECT EVENT] Resetting ${broadcastMqttTopics.length} topics to isSubscribed=false`);
        broadcastMqttTopics.forEach((topic) => {
          dispatch(updateMqttTopic({ topic: topic, isSubscribed: false }));
        });
      });

      client.on("message", (topic, message) => {
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
            broadcastChannel: broadcastProgrammCode,
          })
        );
      });

      client.on("error", (err) => {
        if (clientRef.current !== client) return;
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

      client.on("reconnect", () => {
        if (clientRef.current !== client) return;
        // Connect-time token may be stale; Auth.js refreshes it every 10s.
        const { email: currentEmail, token: currentToken } = store.getState().UserProfile.userProfile;
        const refreshed = currentToken !== client.options.password;
        debugLog(`[RECONNECT EVENT] MQTT attempting reconnection... credentials ${refreshed ? "REFRESHED" : "unchanged"} (token ...${(currentToken || "").slice(-8)})`);
        client.options.username = currentEmail;
        client.options.password = currentToken;
      });

      client.on("offline", () => {
        if (clientRef.current !== client) return;
        debugLog("[OFFLINE EVENT] MQTT went offline");
        dispatch(setConnected(false));
        dispatch(addMqttNotification({
          message: "MQTT offline. Will reconnect.",
          type: "error"
        }));
        // Immediately try to reconnect when offline
        setTimeout(() => tryReconnect(), IMMEDIATE_RECONNECT_DELAY);
      });

      client.on("close", () => {
        if (clientRef.current !== client) return;
        debugLog("[CLOSE EVENT] MQTT connection closed");
        dispatch(setConnected(false));
        // Immediately try to reconnect on close
        setTimeout(() => tryReconnect(), IMMEDIATE_RECONNECT_DELAY);
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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
      const { username, firstName, lastName } = state.UserProfile.userProfile;

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
  }, [dispatch]); // dispatch is stable — still runs only once

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
  republishSubtitle(mqttMessages, channel, langCode, DM_NONE, false, "mode_change");
  republishQuestion(mqttMessages, channel, langCode, DM_NONE, false, "mode_change");
  turnKaraokeOff(mqttMessages, channel);
};

// Karaoke is channel-wide and mutually exclusive with subtitles/questions: any
// non-karaoke action turns it off for everyone. This flips the karaoke topic to
// off (only when it's currently on, to avoid spamming the topic). It does NOT
// touch any language's mode — each client falls back to its own langDisplayMode.
function turnKaraokeOff(mqttMessages, channel, ignoreLiveMode = false) {
  const karaokeTopic = getKaraokeMqttTopic(channel);
  const lastKaraoke = mqttMessages[karaokeTopic];
  if (lastKaraoke && lastKaraoke.display_status === DM_KARAOKE) {
    const message = { ...lastKaraoke, display_status: DM_NONE, visible: false, action: "mode_change" };
    publishEvent("mqttPublish", { mqttTopic: karaokeTopic, message, ignoreLiveMode });
  }
}

// Used only locally in this file, will only update question displayMode if needed.
function republishQuestion(mqttMessages, channel, langCode, displayMode, ignoreLiveMode = false, action = "republish") {
  const questionMqttTopic = getQuestionMqttTopic(channel, langCode);
  const lastQuestion = mqttMessages[questionMqttTopic] || {};
  if (lastQuestion.display_status !== displayMode) {
    publishMessage(lastQuestion, ST_QUESTION, questionMqttTopic, langCode, displayMode, ignoreLiveMode, action);
  }
}

// Used only locally in this file, will only update subtitle displayMode if needed.
function republishSubtitle(mqttMessages, channel, langCode, displayMode, ignoreLiveMode = false, action = "republish") {
  const subtitleMqttTopic = getSubtitleMqttTopic(channel, langCode);
  const lastSubtitle = mqttMessages[subtitleMqttTopic] || {};
  if (lastSubtitle.display_status !== displayMode) {
    publishMessage(lastSubtitle, ST_SUBTITLE, subtitleMqttTopic, langCode, displayMode, ignoreLiveMode, action);
  }
}

// Updates question and if needed also updated subtitle displayMode.
export function publishQuestion(question, mqttMessages, channel, langCode, displayMode, ignoreLiveMode = false, action = "send") {
  const questionMqttTopic = getQuestionMqttTopic(channel, langCode);
  publishMessage(question || {}, ST_QUESTION, questionMqttTopic, langCode, displayMode, ignoreLiveMode, action);
  republishSubtitle(mqttMessages, channel, langCode, displayMode, ignoreLiveMode, ["send", "clear", "restore"].includes(action) ? "republish" : action);
  turnKaraokeOff(mqttMessages, channel, ignoreLiveMode);
}

// Updates subtitle and if needed also updated question displayMode.
export function publishSubtitle(subtitle, mqttMessages, channel, langCode, displayMode, ignoreLiveMode = false, action = "send") {
  const subtitleMqttTopic = getSubtitleMqttTopic(channel, langCode);
  publishMessage(subtitle || {}, ST_SUBTITLE, subtitleMqttTopic, langCode, displayMode, ignoreLiveMode, action);
  republishQuestion(mqttMessages, channel, langCode, displayMode, ignoreLiveMode, action === "send" ? "republish" : action);
  turnKaraokeOff(mqttMessages, channel, ignoreLiveMode);
}

function detectIsLtr(text) {
  if (!text) return true;
  const rtlPattern = /[֐-׿؀-ۿ]/;
  return !rtlPattern.test(text);
}

// Karaoke ON. Channel-wide: every client flips karaokeActive=true on receipt,
// which overrides subtitles/questions for all languages. Subtitle/question
// topics are intentionally left untouched (per-language fallback is preserved
// for when karaoke turns off).
export function publishKaraoke(slide, channel, displayMode = "karaoke", ignoreLiveMode = false) {
  const karaokeTopic = getKaraokeMqttTopic(channel);
  const isLtr = detectIsLtr(slide?.slide);
  const message = {
    slide_type: "karaoke",
    type: "karaoke",
    ID: slide?.ID,
    file_uid: slide?.file_uid,
    order_number: slide?.order_number,
    slide: slide?.slide || "",
    isLtr,
    visible: true,
    renderer: slide?.renderer || "default",
    display_status: displayMode,
  };
  publishEvent("mqttPublish", { mqttTopic: karaokeTopic, message, ignoreLiveMode });
}

// Karaoke ON, restoring the retained selection. Guarded by identity, not text:
// an empty slide is a valid selection (shows nothing, but keeps the position).
export function restoreKaraoke(mqttMessages, channel) {
  const lastKaraoke = mqttMessages[getKaraokeMqttTopic(channel)];
  if (lastKaraoke?.file_uid) {
    publishKaraoke(lastKaraoke, channel);
  }
}

export const publishMessage =(slide, type, topic, lang, displayMode, ignoreLiveMode, action = "send") => {
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
    action,

    // Important to override display mode.
    display_status: displayMode,
  };

  publishEvent("mqttPublish", { mqttTopic: topic, message: message, ignoreLiveMode });
};
