import { VI as ServiceId } from "../../../shared/constants/services.js";
import { OFFICIAL_LLM_NAME } from "../../../shared/openaiUtils.js";

const officialLlmService = {
  id: ServiceId.OfficialLLM,
  name: OFFICIAL_LLM_NAME,
  free: false,
  package: false,
};

export { officialLlmService as O };
