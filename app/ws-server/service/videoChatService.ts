import { instrument } from "@socket.io/admin-ui";
import { Server } from "socket.io";

export default function setVideoChatService(chatServer: Server) {
  instrument(chatServer, { auth: false, mode: "development" }); // admin mode

  chatServer.on("connection", (socket) => {
    console.log(`🔵Client connected video chat ws server: ${socket.id}`);

    // 입장
    socket.on("enter_room", (done: (roomName: string) => void) => {
      console.log(`${socket.id} enter room "videoChatRoom"`);
      socket.join("videoChatRoom");

      done("videoChatRoom");
      socket.to("videoChatRoom").emit("user_joined", "videoChatRoom");
    });

    // offer 전달
    socket.on("send_offer", (roomName: string, offer: RTCSessionDescriptionInit) => {
      console.log("receive_offer");
      socket.to(roomName).emit("receive_offer", roomName, offer);
    });

    // answer 전달
    socket.on("send_answer", (roomName: string, answer: RTCSessionDescriptionInit) => {
      console.log("send_answer");
      socket.to(roomName).emit("receive_answer", answer);
    });

    // ice 전달
    socket.on("send_ice", (roomName: string, ice: RTCIceCandidate) => {
      console.log("send_ice");
      socket.to(roomName).emit("receive_ice", ice);
    });

    // 채팅방 나가기
    socket.on("leave_chat", (roomName: string, streamId: string, done: () => void) => {
      socket.leave(roomName);
      done();
      console.log(`User left chat: ${socket.id}`);
      socket.to(roomName).emit("user_leaved", streamId);
    });

    // 연결 종료시 room 에서 퇴장
    socket.on("disconnecting", () => {
      socket.rooms.forEach((room) => {
        socket.leave(room);
      });
    });
  });
}
