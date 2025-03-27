import { createAdapter } from "@socket.io/mongo-adapter";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import connectCollection from "@/lib/db";

import setUpChatService from "./service/chatService";
import setUpServerChatService from "./service/serverChatService";

const app = express();
const httpServer = createServer(app);

const wsServer = new Server(httpServer, { cors: { origin: "http://localhost:5173" }, path: "/chat" });

const { chatCollection } = await connectCollection();

const serverChatServer = new Server(httpServer, {
  cors: { origin: ["https://admin.socket.io", "http://localhost:5173"], credentials: true },
  path: "/server-chat",
  adapter: createAdapter(chatCollection, {
    addCreatedAtField: true, // 문서가 저장될 때 자동으로 createdAt 필드를 추가
  }),
});

setUpChatService(wsServer); // basic ws server
setUpServerChatService(serverChatServer); // mongodb adapted ws server

httpServer.listen(3000, () => console.log(`ws server start`));
