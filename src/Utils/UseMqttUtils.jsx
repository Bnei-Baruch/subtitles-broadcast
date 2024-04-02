import { useState, useEffect } from "react";
import mqtt from "mqtt";

const mqttUrl = process.env.REACT_APP_MQTT_URL;
const mqttProtocol = process.env.REACT_APP_MQTT_PROTOCOL;
const mqttPort = process.env.REACT_APP_MQTT_PORT;
const mqttPath = process.env.REACT_APP_MQTT_PATH;
//const mqttOptions = { protocol: mqttProtocol, clientId: mqttClientId };
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
    console.log(`Set MQTT Client: ${clientId}`);
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
  };

  const mqttPublush = async (mqttTopic, msgText) => {
    if (mqttClient) {
      mqttClient.publish(
        mqttTopic,
        msgText,
        { label: "0", value: 0, retain: true },
        (error) => {
          if (error) {
            console.log("Publish error:", error);
          }
        }
      );
    }
  };

  const mqttDisconnect = () => {
    if (mqttClient) {
      mqttClient.end(() => {
        console.log("MQTT Disconnected");
        setIsConnected(false);
      });
    }
  };

  const mqttSubscribe = async (topic) => {
    if (mqttClient) {
      console.log("MQTT subscribe ", topic);
      const clientMqtt = await mqttClient.subscribe(
        topic,
        {
          qos: 0,
          rap: false,
          rh: 0,
        },
        (error) => {
          if (error) {
            console.log("MQTT Subscribe to topics error", error);
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
          console.log("MQTT Unsubscribe error", error);
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
        console.log("MQTT Connected");
      });
      mqttClient.on("error", (err) => {
        console.error("MQTT Connection error: ", err);
        mqttClient.end();
      });
      mqttClient.on("reconnect", () => {
        setIsConnected(true);
      });
      mqttClient.on("message", (_topic, message) => {
        const payloadMessage = { topic: _topic, message: message.toString() };
        setPayload(payloadMessage);
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
