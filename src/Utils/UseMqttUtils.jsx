import { useState, useEffect } from "react";
import mqtt from "mqtt";
import {
  subscribeEvent,
  unsubscribeEvent,
  publishEvent,
} from "../Utils/Events";

const mqttUrl = process.env.REACT_APP_MQTT_URL;
const mqttProtocol = process.env.REACT_APP_MQTT_PROTOCOL;
const mqttPort = process.env.REACT_APP_MQTT_PORT;
const mqttPath = process.env.REACT_APP_MQTT_PATH;
const mqttBrokerUrl = `${mqttProtocol}://${mqttUrl}:${mqttPort}/${mqttPath}`;

const setting = {
  url: mqttBrokerUrl,
  config: {
    username: "",
    password: "",
    port: mqttPort,
  },
};

export default function useMqtt() {
  const [mqttClient, setMqttClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [payload, setPayload] = useState({});
  const [clientId, setClientId] = useState(false);

  const getClientId = () => {
    const clientId = `kab_subtitles_${Math.random().toString(16).substr(2, 8)}`;
    console.log(`useMqtt Set MQTT Client: ${clientId}`);
    return clientId;
  };

  const mqttConnect = async () => {
    const clientId = getClientId();
    const url = setting.url;
    const options = {
      clientId,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 300000,
      connectTimeout: 30000,
      rejectUnauthorized: false,
      ...setting.config,
    };
    const clientMqtt = await mqtt.connect(url, options);
    setMqttClient(clientMqtt);
    setClientId(clientId);
    console.log("useMqtt ", clientId);
  };

  const mqttPublush = async (mqttTopic, msgText) => {
    if (mqttClient) {
      mqttClient.publish(
        mqttTopic,
        msgText,
        { label: "0", value: 0, retain: true },
        (error) => {
          if (error) {
            console.log("useMqtt  Publish error:", error);
          } else {
            console.log(
              `"useMqtt  Published Topic: ${mqttTopic} Message: ${msgText}`
            );
          }
        }
      );
    }
  };

  const mqttDisconnect = () => {
    if (mqttClient) {
      mqttClient.end(() => {
        console.log("useMqtt  MQTT Disconnected", clientId);
        setIsConnected(false);
      });
    }
  };

  const mqttSubscribe = async (topic) => {
    if (mqttClient) {
      console.log("useMqtt MQTT subscribe ", topic);
      const clientMqtt = await mqttClient.subscribe(
        topic,
        {
          qos: 0,
          rap: false,
          rh: 0,
        },
        (error) => {
          if (error) {
            console.log("useMqtt MQTT Subscribe to topics error", error);
            return;
          }
        }
      );
      setMqttClient(clientMqtt);
    }
  };

  const mqttUnSubscribe = async (topic) => {
    if (mqttClient) {
      const clientMqtt = await mqttClient.unsubscribe(topic, (error) => {
        if (error) {
          console.log("useMqtt MQTT Unsubscribe error", error);
          return;
        }
      });
      setMqttClient(clientMqtt);
    }
  };

  useEffect(() => {
    mqttConnect();
    return () => {
      mqttDisconnect();
    };
  }, []);

  useEffect(() => {
    if (mqttClient) {
      mqttClient.on("connect", () => {
        setIsConnected(true);
        console.log("useMqtt MQTT Connected", clientId);
      });
      mqttClient.on("error", (err) => {
        console.error("useMqtt MQTT Connection error: ", err);
        mqttClient.end();
      });
      mqttClient.on("reconnect", () => {
        setIsConnected(true);
      });
      mqttClient.on("message", (_topic, message) => {
        const payloadMessage = { topic: _topic, message: message.toString() };
        const newMessage = JSON.parse(payloadMessage.message);

        publishEvent(_topic, {
          mqttTopic: _topic,
          clientId: clientId,
          messageJson: newMessage,
        });

        setPayload(payloadMessage);

        console.log(
          `useMqtt MQTT message: ${message.toString()} \n topic: ${_topic}`
        );
      });
    }
  }, [mqttClient]);

  return {
    mqttConnect,
    mqttDisconnect,
    mqttSubscribe,
    mqttUnSubscribe,
    mqttPublush,
    payload,
    isConnected,
    clientId,
  };
}

export function parseMqttMessage(mqttMessage) {
  if (mqttMessage) {
    try {
      if (typeof mqttMessage === "string") {
        let msgJson = JSON.parse(mqttMessage);

        return msgJson;
      }
    } catch (err) {
      console.log(err);
    }

    return mqttMessage;
  }
}
