import { VI as ServiceId } from "./services.js";

const serviceIcons = {
  [ServiceId.Google]: chrome.runtime.getURL("google.ico"),
  [ServiceId.Microsoft]: chrome.runtime.getURL("microsoft.png"),
  [ServiceId.OfficialLLM]: chrome.runtime.getURL("official-llm.svg"),
};

export { serviceIcons as K };
