import createDebug from "debug";
import { $X as isThenable } from "../shared/utils/index.js";
import {
  writeToClipboard,
  playWithAudio,
  playWithSpeech,
} from "../shared/domMedia.js";

const log = createDebug("@hcfyapp/messaging:onMessage");

function registerMessageHandler(handler) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const resolve = (val) => {
      log("resolve", val);
      sendResponse({ __messaging: true, __messaging_resolve: val });
    };
    const reject = (err) => {
      log("reject", err);
      const serialized =
        err != null && typeof err === "object" && typeof err.toJSON === "function"
          ? err.toJSON()
          : err instanceof Error
            ? { name: err.name, message: err.message }
            : err;
      sendResponse({ __messaging: true, __messaging_reject: serialized });
    };
    const result = handler(message, { sender, resolve, reject });
    if (isThenable(result)) {
      result.then(resolve, reject);
      return true;
    }
    return result;
  });
}

registerMessageHandler((msg) => {
  switch (msg.action) {
    case "dom: write to clipboard":
      return writeToClipboard(msg.text);
    case "dom: play with audio":
      return playWithAudio(msg.url, msg.options);
    case "dom: play with speech":
      return playWithSpeech(msg.text, msg.options);
  }
});
