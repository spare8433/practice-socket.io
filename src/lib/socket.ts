import { io } from "socket.io-client";

// "undefined" means the URL will be computed from the `window.location` object
const URL = import.meta.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";

export const chatSocket = io(`${URL}/chat`); // "/chat" 네임스페이스에 연결
