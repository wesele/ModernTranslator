import { G as googleService } from "./providers/google.js";
import { W as microsoftService } from "./providers/microsoft.js";
import { O as officialLlmService } from "./providers/officialLlm.js";

const allTranslators = [googleService, microsoftService, officialLlmService];

export { allTranslators as B };
export { allTranslators as v };
