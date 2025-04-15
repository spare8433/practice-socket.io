import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { type ConfigEnv, defineConfig, loadEnv, type UserConfigExport } from "vite";

// https://vitejs.dev/config/
export default ({ mode }: ConfigEnv): UserConfigExport => {
  // .env 파일을 로딩해서 사용할 수 있게 함
  const env = loadEnv(mode, process.cwd());

  return defineConfig({
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./app"),
      },
    },
    server: {
      allowedHosts: [env.VITE_HOST],
    },
  });
};
