import mqtt from "mqtt";

function initMqttClient(setMqttClient, setMqttClientId) {
  const mqttClientId =
    "kab_subtitles_" + Math.random().toString(16).substring(2, 8);
  const mqttUrl = process.env.REACT_APP_MQTT_URL;
  const mqttProtocol = process.env.REACT_APP_MQTT_PROTOCOL;
  const mqttPort = process.env.REACT_APP_MQTT_PORT;
  const mqttPath = process.env.REACT_APP_MQTT_PATH;

  const mqttOptions = { protocol: mqttProtocol, clientId: mqttClientId };
  const mqttBrokerUrl = `${mqttProtocol}://${mqttUrl}:${mqttPort}/${mqttPath}`;

  const mqttClient = mqtt.connect(mqttBrokerUrl, mqttOptions);

  setMqttClient(mqttClient);
  setMqttClientId(mqttClientId);

  return { mqttClient: mqttClient, mqttClientId: mqttClientId };
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

export default initMqttClient;
