import { instrument } from "@socket.io/admin-ui";
import { Server } from "socket.io";

import { BidirectionalMap } from "@/lib/bidirectionalMap";

export default function setVideoChatService(chatServer: Server) {
  instrument(chatServer, { auth: false, mode: "development" }); // admin mode
  const userList = new BidirectionalMap(); // socket.id: peerId

  chatServer.on("connection", (socket) => {
    console.log(`🔵Client connected video chat ws server: ${socket.id}`);

    // 입장
    socket.on("enter_room", (peerId: string, done: (roomName: string) => void) => {
      console.log(`${socket.id} enter room "videoChatRoom"`);
      socket.join("videoChatRoom");
      userList.set(socket.id, peerId);
      console.log("current userList", userList.entries());

      done("videoChatRoom");
      socket.to("videoChatRoom").emit("user_joined", "videoChatRoom", peerId);
      chatServer.to("videoChatRoom").emit("users_changed", userList.toValueKeyArray());
    });

    // offer 전달
    socket.on("send_offer", (roomName: string, peerId: string, offer: RTCSessionDescriptionInit) => {
      console.log("receive_offer");
      socket.to(roomName).emit("receive_offer", roomName, peerId, offer);
    });

    // answer 전달
    socket.on("send_answer", (roomName: string, peerId: string, answer: RTCSessionDescriptionInit) => {
      console.log("send_answer");
      socket.to(roomName).emit("receive_answer", peerId, answer);
    });

    // ice 전달
    socket.on("send_ice", (roomName: string, peerId: string, ice: RTCIceCandidate) => {
      console.log("send_ice");
      socket.to(roomName).emit("receive_ice", peerId, ice);
    });

    // 채팅방 나가기
    socket.on("leave_chat", (roomName: string, peerId: string) => {
      socket.leave(roomName);
      userList.deleteByValue(peerId);
      console.log(`User left chat: ${socket.id}`);
      console.log("current userList", userList.entries());
      socket.to(roomName).emit("user_leaved", peerId);
      chatServer.to("videoChatRoom").emit("users_changed", userList.toValueKeyArray());
    });

    // 연결 종료시 room 에서 퇴장
    socket.on("disconnecting", () => {
      userList.deleteByKey(socket.id);
      socket.rooms.forEach((room) => socket.leave(room));
      console.log(userList.entries());
      chatServer.to("videoChatRoom").emit("users_changed", userList.toValueKeyArray());
    });
  });
}
