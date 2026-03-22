/**
 * Injected in <head> before streamed CSS. Uses :where() so specificity stays 0 — full Tailwind
 * in globals.css wins when it loads, but users never see a “raw HTML” flash if CSS is slow or blocked.
 */
export const criticalFallbackCss = `
:root { color-scheme: light; }
:where(html) { background-color: hsl(75, 56%, 95%); }
:where(body) {
  margin: 0;
  min-height: 100vh;
  background-color: hsl(75, 56%, 95%);
  color: hsl(0, 15%, 28%);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
:where(a) { color: hsl(0, 15%, 36%); }
:where(a:visited) { color: hsl(0, 15%, 32%); }
`;
