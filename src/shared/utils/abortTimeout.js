const s = AbortSignal.timeout
  ? function (e) {
      return AbortSignal.timeout(e);
    }
  : function (e) {
      const t = new AbortController();
      return (
        setTimeout(() => {
          t.abort();
        }, e),
        t.signal
      );
    };
export { s as _ };
