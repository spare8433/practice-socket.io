import { io } from "socket.io-client";

// "undefined" means the URL will be computed from the `window.location` object
const URL = import.meta.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";

export const chatSocket = io(URL, { path: "/chat" }); // "/chat" 서버에 연결
export const serverChatSocket = io(URL, { path: "/server-chat" }); // "/chat" 서버에 연결
