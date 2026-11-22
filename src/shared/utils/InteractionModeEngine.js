class a {
  container;
  className;
  isRunning = false;
  constructor(t, e) {
    ((this.container = t), (this.className = e));
  }
  isActive() {
    return this.isRunning;
  }
  start() {
    (this.container.addEventListener("mousedown", this.handleMouseDown), (this.isRunning = true));
  }
  stop() {
    (this.reset(), (this.isRunning = false));
  }
  reset() {
    (this.container.classList.remove(this.className),
      this.container.removeEventListener("keydown", this.handleKeyDown),
      this.container.removeEventListener("mousedown", this.handleMouseDown));
  }
  handleKeyDown = (t) => {
    "Tab" === t.key &&
      (this.reset(), this.container.addEventListener("mousedown", this.handleMouseDown));
  };
  handleMouseDown = () => {
    (this.reset(),
      this.container.classList.add(this.className),
      this.container.addEventListener("keydown", this.handleKeyDown));
  };
}
export { a as y };
