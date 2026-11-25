import "../shared/polyfills/firefoxRaf.js";
import { Z as SelectionManager } from "../content/selectionManager.js";
import { $ as isTopWindow } from "../shared/utils/isTopWindow.js";

if (!isTopWindow && !window.__NDT_FRAME_SELECTION_MOUNTED__) {
  window.__NDT_FRAME_SELECTION_MOUNTED__ = true;
  new SelectionManager();
}
