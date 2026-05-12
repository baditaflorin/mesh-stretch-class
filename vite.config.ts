import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const commit = env.VITE_GIT_COMMIT || env.GITHUB_SHA || "local";
  const version = env.VITE_APP_VERSION || process.env.npm_package_version || "0.1.0";

  return {
    base: "/mesh-stretch-class/",
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __GIT_COMMIT__: JSON.stringify(commit.slice(0, 12)),
    },

    resolve: {
      dedupe: ["react", "react-dom", "yjs", "y-webrtc"],
    },
    build: {
      outDir: "docs",
      emptyOutDir: false,
      sourcemap: true,
    },
  };
});
