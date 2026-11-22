import { Z as SelectionManager } from "../content/selectionManager.js";
import { $ as isTopWindow } from "../shared/utils/isTopWindow.js";

if (!isTopWindow) {
  new SelectionManager();
}
