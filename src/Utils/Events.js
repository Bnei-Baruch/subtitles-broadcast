function subscribeEvent(eventName, listener) {
  //console.log("subscribeEvent: " + eventName);
  document.addEventListener(eventName, listener);
}

function unSubscribeEvent(eventName, listener) {
  //console.log("unsubscribeEvent: " + eventName, listener);
  document.removeEventListener(eventName, listener);
}

function publishEvent(eventName, data) {
  //console.log("publishEvent: " + eventName, data);
  const event = new CustomEvent(eventName, { detail: data });
  document.dispatchEvent(event);
}

export { publishEvent, subscribeEvent, unSubscribeEvent };
