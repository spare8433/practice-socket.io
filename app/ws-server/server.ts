import { createAdapter } from "@socket.io/mongo-adapter";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import connectCollections from "@/lib/db";

import setChatService from "./service/chatService";
import setDblessChatService from "./service/dblessChatService";
import setVideoChatService from "./service/videoChatService";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const TEMP_HOST_SERVER = process.env.TEMP_HOST_SERVER;

const dblessChatServer = new Server(httpServer, {
  cors: { origin: ["http://localhost:5173", TEMP_HOST_SERVER] },
  path: "/chat",
});

const { chatCollection, videoChatCollection } = await connectCollections();

const chatServer = new Server(httpServer, {
  cors: { origin: ["https://admin.socket.io", "http://localhost:5173", TEMP_HOST_SERVER], credentials: true },
  path: "/server-chat",
  adapter: createAdapter(chatCollection, {
    addCreatedAtField: true, // 문서가 저장될 때 자동으로 createdAt 필드를 추가
  }),
});

const videoChatServer = new Server(httpServer, {
  cors: { origin: ["https://admin.socket.io", "http://localhost:5173", TEMP_HOST_SERVER], credentials: true },
  path: "/server-video-chat",
  adapter: createAdapter(videoChatCollection, {
    addCreatedAtField: true, // 문서가 저장될 때 자동으로 createdAt 필드를 추가
  }),
});

setDblessChatService(dblessChatServer); // set dbless chat ws server
setChatService(chatServer); //  set chat ws server with mongodb
setVideoChatService(videoChatServer); // set video chat ws server with mongodb

httpServer.listen(3000, () => console.log(`ws server start`));
