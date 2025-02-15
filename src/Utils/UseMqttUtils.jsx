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
  getSubtitlesDisplayModeTopic,
} from "../Utils/Common";
import { subscribeEvent } from "../Utils/Events";
import debugLog from "../Utils/debugLog";

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
      debugLog("🔵 Connecting to MQTT Broker...");
      clientRef.current = mqtt.connect(mqttBrokerUrl);

      clientRef.current.on("connect", () => {
        debugLog("🟢 MQTT Connected");

        dispatch(setConnected(true));

        let broadcastMqttTopics = broadcastLanguages
          .map((langItem) => {
            return [
              getQuestionMqttTopic(broadcastProgrammCode, langItem.value), // ✅ Per-language questions
              getSubtitlesDisplayModeTopic(
                broadcastProgrammCode,
                langItem.value
              ), // ✅ Per-language display mode with program code
            ];
          })
          .flat(); // ✅ Flatten array so topics are not nested

        // ✅ Add slide topics
        broadcastMqttTopics.push(
          getSubtitleMqttTopic(broadcastProgrammCode, broadcastLangCode)
        );

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
        debugLog("📩 MQTT Message Received:", topic, message.toString());

        dispatch(mqttMessageReceived({ topic, message: message.toString() }));

        // if (topic === "subtitles/display_mode") {
        //   const parsedMessage = JSON.parse(message);
        //   dispatch(setSubtitlesDisplayModeFromMQTT(parsedMessage.slide));
        // }

        if (topic.includes("/display_mode")) {
          const parsedMessage = JSON.parse(message);
          const topicParts = topic.split("/");
          const topicProgramCode = topicParts[1]; // Extract program code
          const topicLang = topicParts[2]; // Extract language

          if (
            topicLang === broadcastLangCode &&
            topicProgramCode === broadcastProgrammCode
          ) {
            debugLog(
              "🔄 Updating subtitlesDisplayMode for:",
              topicProgramCode,
              topicLang
            );
            dispatch(setSubtitlesDisplayModeFromMQTT(parsedMessage.slide));
          } else {
            debugLog(
              "🛑 Ignoring subtitlesDisplayMode update (wrong program or language)"
            );
          }
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
          debugLog("🚀 Publishing to MQTT:", mqttTopic, payloadString);

          clientRef.current.publish(
            mqttTopic,
            payloadString,
            { retain: true },
            (err) => {
              if (err) {
                console.error("❌ MQTT Publish Error:", err);
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
      if (clientRef.current) {
        debugLog("🔴 Disconnecting MQTT...");
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
