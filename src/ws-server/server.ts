import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import setUpChatService from "./service/chatService";

const app = express();

const httpServer = createServer(app);
const wsServer = new Server(httpServer, {
  cors: { origin: "http://localhost:5173" },
});

const chatNamespace = wsServer.of("/chat");
setUpChatService(chatNamespace);

// wsServer.on("connection", (socket) => {
//   socket.on("select_service", (serviceName: string) => {
//     const handler = serviceHandlers[serviceName];

//     if (handler) {
//       handler(socket);
//     } else {
//       socket.emit("error", `Unknown service: ${serviceName}`);
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log(`Client disconnected: ${socket.id}`);
//   });
// });

httpServer.listen(3000, () => console.log(`ws server start`));
