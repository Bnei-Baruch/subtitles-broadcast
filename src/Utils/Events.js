function subscribeEvent(eventName, listener) {
  // console.log("subscribeEvent: " + eventName, listener);
  document.addEventListener(eventName, listener);
}

function unsubscribeEvent(eventName, listener) {
  //console.log("unsubscribeEvent: " + subscribeEvent, listener);
  document.removeEventListener(eventName, listener);
}

function publishEvent(eventName, data) {
  //console.log("publishEvent: " + eventName, data);
  const event = new CustomEvent(eventName, { detail: data });
  document.dispatchEvent(event);
}

export { publishEvent, subscribeEvent, unsubscribeEvent };
