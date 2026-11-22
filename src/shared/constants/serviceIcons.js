import { VI as ServiceId } from "./services.js";

const serviceIcons = {
  [ServiceId.Google]: chrome.runtime.getURL("google-engine.svg"),
  [ServiceId.Microsoft]: chrome.runtime.getURL("microsoft-engine.svg"),
  [ServiceId.OfficialLLM]: chrome.runtime.getURL("official-llm.svg"),
};

export { serviceIcons as K };
