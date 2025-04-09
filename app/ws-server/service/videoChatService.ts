import { instrument } from "@socket.io/admin-ui";
import { Server } from "socket.io";

export default function setVideoChatService(chatServer: Server) {
  instrument(chatServer, { auth: false, mode: "development" }); // admin mode

  chatServer.on("connection", (socket) => {
    console.log(`🔵Client connected video chat ws server: ${socket.id}`);

    // 입장
    socket.on("enter_room", (peerId: string, done: (roomName: string) => void) => {
      console.log(`${socket.id} enter room "videoChatRoom"`);
      socket.join("videoChatRoom");

      done("videoChatRoom");
      socket.to("videoChatRoom").emit("user_joined", "videoChatRoom", peerId);
    });

    // offer 전달
    socket.on("send_offer", (roomName: string, peerId: string, offer: RTCSessionDescriptionInit, done: () => void) => {
      console.log("receive_offer");
      done();
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
    socket.on("leave_chat", (roomName: string, peerId: string, done: () => void) => {
      socket.leave(roomName);
      done();
      console.log(`User left chat: ${socket.id}`);
      socket.to(roomName).emit("user_leaved", peerId);
    });

    // 연결 종료시 room 에서 퇴장
    socket.on("disconnecting", () => {
      socket.rooms.forEach((room) => {
        socket.leave(room);
      });
    });
  });
}
