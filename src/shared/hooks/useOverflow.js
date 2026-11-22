import * as React from "react";
function r(e) {
  return {
    h: e.scrollWidth > e.clientWidth,
    v: e.scrollHeight > e.clientHeight,
  };
}
function o(e) {
  const [t, n] = React.useState({
    v: false,
    h: false,
  });
  return (
    React.useEffect(() => {
      if (!e) return;
      const t = () => {
        n(r(e));
      };
      t();
      const s = new ResizeObserver(t);
      return (
        s.observe(e),
        () => {
          s.unobserve(e);
        }
      );
    }, [e]),
    t
  );
}
export { r as D };
export { o as W };
