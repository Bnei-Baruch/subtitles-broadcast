import { useEffect, useRef } from "react";
import mqtt from "mqtt";
import { useDispatch, useSelector } from "react-redux";
import {
  setConnected,
  updateMqttTopic,
  mqttMessageReceived,
  setClientId,
  addMqttError,
  resetMqttLoading,
} from "../Redux/MQTT/mqttSlice";
import { broadcastLanguages } from "../Utils/Const";
import { getSubtitleMqttTopic, getQuestionMqttTopic } from "../Utils/Common";
import { subscribeEvent, unSubscribeEvent } from "../Utils/Events"; // Ensure `unsubscribeEvent` exists
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
      debugLog("Connecting to MQTT Broker...");
      clientRef.current = mqtt.connect(mqttBrokerUrl, {
        keepalive: 60, // seconds
        reconnectPeriod: 2000, // ms

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
            broadcastProgrammCode,
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
        dispatch(resetMqttLoading());
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
        dispatch(resetMqttLoading());
      }

      if (clientIdRef && clientIdRef.current) {
        clientIdRef.current = null;
      }
    };
  }, [dispatch, broadcastLangCode]);

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
        dispatch(resetMqttLoading());
        return;
      }

      // Prevent duplicate publishing if the last message was the same
      const mqttMessageForTopic = store.getState().mqtt.mqttMessages[mqttTopic];
      const isDuplicate =
        mqttMessageForTopic &&
        mqttMessageForTopic.slide === message.slide &&
        mqttMessageForTopic.type === message.type &&
        mqttMessageForTopic.visible === message.visible &&
        mqttMessageForTopic.display_status === message.display_status;

      if (isDuplicate) {
        debugLog("Skipping duplicate MQTT publish:", mqttTopic, message);
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
              dispatch(resetMqttLoading());
            } else {
              debugLog(" MQTT Publish Successful:", mqttTopic, enhancedMessage);
            }
          }
        );
      }
    };

    // Add listener only once
    subscribeEvent("mqttPublish", mqttPublishHandler);

    //  Remove listener on component unmount correctly
    return () => {
      debugLog(" Removing MQTT publish listener");
      if (typeof unSubscribeEvent === "function") {
        unSubscribeEvent("mqttPublish", mqttPublishHandler);
      } else {
        console.warn(
          "Unable to remove event listener: unSubscribeEvent is not defined"
        );
      }
    };
  }, []); // Runs only once

  return {
    subscribe: (topic) => {
      if (!mqttTopics[topic]?.isSubscribed) {
        clientRef.current.subscribe(topic);
        dispatch(updateMqttTopic({ topic: topic, isSubscribed: true }));
        debugLog("MQTT Subscribed to topic: ", topic);
      }
    },
    unsubscribe: (topic) => {
      if (!clientRef || !clientRef.current) {
        return;
      }

      clientRef.current.unsubscribe(topic);
      dispatch(updateMqttTopic({ topic: topic, isSubscribed: false }));
      debugLog("MQTT UnSubscribed to topic: ", topic);
    },
  };
}
