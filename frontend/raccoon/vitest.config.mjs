import { defineConfig } from "vitest/config";
import { transformWithOxc } from "vite";
import react from "@vitejs/plugin-react";

// CRA يقبل JSX داخل ملفات .js (مثل app/App.js و index.js)، و Vite ما يقبله افتراضيًا.
// هذا يقرأ ملفات .js داخل src كـ JSX، للاختبارات فقط.
const jsxInJs = {
  name: "jsx-in-js",
  enforce: "pre",
  async transform(code, id) {
    if (!/\/src\/.*\.js$/.test(id) || !code.includes("<")) return null;
    return transformWithOxc(code, id, {
      lang: "jsx",
      jsx: { runtime: "automatic" },
    });
  },
};

// الاختبارات فقط. التشغيل والبناء يبقون على react-scripts.
export default defineConfig({
  plugins: [jsxInJs, react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.js"],
    include: ["src/**/*.test.{js,jsx}"],
    env: { REACT_APP_API_URL: "http://api.test" },
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.test.{js,jsx}",
        "src/index.js",
        "src/reportWebVitals.js",
        "src/setupTests.js",
      ],
    },
  },
});
