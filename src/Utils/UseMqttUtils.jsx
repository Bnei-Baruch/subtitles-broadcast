import { useEffect, useRef } from "react";
import mqtt from "mqtt";
import { useDispatch, useSelector } from "react-redux";
import {
  setConnected,
  addMqttTopic,
  removeMqttTopic,
  mqttMessageReceived,
  setSubtitlesDisplayModeFromMQTT,
  setClientId,
} from "../Redux/MQTT/mqttSlice";
import { broadcastLanguages } from "../Utils/Const";
import {
  getSubtitleMqttTopic,
  getQuestionMqttTopic,
  subtitlesDisplayModeTopic,
} from "../Utils/Common";
import { subscribeEvent } from "../Utils/Events";

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
  //let clientID;

  const broadcastProgrammCode = useSelector(
    (state) => state.BroadcastParams.broadcastProgramm.value
  );
  const broadcastLangCode = useSelector(
    (state) => state.BroadcastParams.broadcastLang.value
  );

  const subtitleMqttTopic = getSubtitleMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode
  );

  // ✅ Get MQTT messages from Redux **before** the event callback
  // const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);

  // ✅ Retrieve `clientId` from Redux
  let clientId = useSelector((state) => state.mqtt.clientId);
  if (!clientId) {
    clientId = `kab_subtitles_${Math.random().toString(16).substr(2, 8)}`;
    dispatch(setClientId(clientId));
  }
  clientIdRef.current = clientId; // ✅ Store it in a ref to prevent re-renders

  useEffect(() => {
    if (!clientRef.current) {
      console.log("🔵 Connecting to MQTT Broker...");
      clientRef.current = mqtt.connect(mqttBrokerUrl);

      clientRef.current.on("connect", () => {
        console.log("🟢 MQTT Connected");

        dispatch(setConnected(true));

        let broadcastMqttTopics = broadcastLanguages.map((langItem, index) => {
          const mqttTopic = getQuestionMqttTopic(
            broadcastProgrammCode,
            langItem.value
          );
          return mqttTopic;
        });

        broadcastMqttTopics.push(subtitlesDisplayModeTopic);
        broadcastMqttTopics.push(subtitleMqttTopic);

        // ✅ Subscribe only if not already subscribed
        broadcastMqttTopics.forEach((topic) => {
          if (!mqttTopics.includes(topic)) {
            dispatch(addMqttTopic(topic));
            clientRef.current.subscribe(topic);
          }
        });

        mqttTopics.forEach((topic) => clientRef.current.subscribe(topic));
      });

      clientRef.current.on("message", (topic, message) => {
        console.log("📩 MQTT Message Received:", topic, message.toString());

        dispatch(mqttMessageReceived({ topic, message: message.toString() }));

        if (topic === "subtitles/display_mode") {
          const parsedMessage = JSON.parse(message);
          dispatch(setSubtitlesDisplayModeFromMQTT(parsedMessage.slide));
        }
      });

      clientRef.current.on("error", (err) => {
        console.error("❌ MQTT Connection Error:", err);
        clientRef.current.end();
        dispatch(setConnected(false));
      });

      // ✅ Listen for "mqttPublush" and publish messages to MQTT
      subscribeEvent("mqttPublush", (event) => {
        let { mqttTopic, message } = event.detail;

        if (typeof message !== "object") {
          console.error("❌ MQTT Publish Error: Message must be an object");
          return;
        }

        // TODO:  // ✅ Prevent republishing the same message

        // ✅ Add user info to all messages
        const enhancedMessage = {
          ...message,
          clientId: clientIdRef.current || "unknown_client",
          username: username || "unknown_user",
          firstName: firstName || "Unknown",
          lastName: lastName || "User",
          date: new Date().toUTCString(),
        };

        // ✅ Store updated message in Redux before publishing
        dispatch(
          mqttMessageReceived({
            topic: mqttTopic,
            message: JSON.stringify(enhancedMessage),
          })
        );

        if (clientRef.current) {
          const payloadString = JSON.stringify(enhancedMessage);
          console.log("🚀 Publishing to MQTT:", mqttTopic, payloadString);

          clientRef.current.publish(
            mqttTopic,
            payloadString,
            { retain: true },
            (err) => {
              if (err) {
                console.error("❌ MQTT Publish Error:", err);
              } else {
                console.log(
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
      if (clientRef.current) {
        console.log("🔴 Disconnecting MQTT...");
        clientRef.current.end();
        clientRef.current = null;
        clientIdRef.current.end();
        clientIdRef.current = null;
      }
    };
  }, [dispatch]);

  return {
    subscribe: (topic) => {
      if (!mqttTopics.includes(topic)) {
        dispatch(addMqttTopic(topic));
        clientRef.current.subscribe(topic);
      }
    },
    unsubscribe: (topic) => {
      dispatch(removeMqttTopic(topic));
      clientRef.current.unsubscribe(topic);
    },
  };
}
