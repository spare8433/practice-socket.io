import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  layout("components/layout.tsx", [
    index("routes/home.tsx"),
    route("chat-room", "routes/chat-room.tsx"),
    route("server-chat-room", "routes/server-chat-room.tsx"),
  ]),
] satisfies RouteConfig;
