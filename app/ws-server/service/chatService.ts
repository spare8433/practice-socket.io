import { instrument } from "@socket.io/admin-ui";
import { Server } from "socket.io";

export default function setChatService(chatServer: Server) {
  const rooms = new Map<string, Set<string>>();
  const defaultRooms = ["기본 채팅방", "프론트엔드 개발자 채팅방", "백엔드 개발자 채팅방"];
  defaultRooms.forEach((room) => rooms.set(room, new Set()));

  instrument(chatServer, { auth: false, mode: "development" }); // admin mode

  chatServer.on("connection", (socket) => {
    console.log(`🔵Client connected server chat: ${socket.id}`);

    // Room 목록 요청
    socket.on("get_rooms", () => {
      const result: [string, number][] = [];
      rooms.forEach((set, name) => result.push([name, set.size]));
      socket.emit("room_list", result);
    });

    // 입장
    socket.on("enter_room", (roomName: string, done: (roomName: string) => void) => {
      if (!rooms.has(roomName)) return socket.emit("error", `Room '${roomName}' does not exist.`);

      console.log(`${socket.id} enter room ${roomName}`);

      socket.join(roomName);
      rooms.get(roomName)!.add(socket.id);
      console.log(rooms);
      console.log(`📌 ${socket.id} joined room: ${roomName}`);

      done(roomName);
      socket.to(roomName).emit("user_joined", roomName);
    });

    // 채팅
    socket.on("new_message", (data: { roomName: string; message: string }) => {
      console.log(`Received message: ${data.roomName}.${socket.id} > ${data.message}`);
      chatServer.to(data.roomName).emit("receive_message", { message: data.message, userId: socket.id });
    });

    // 채팅방 나가기
    socket.on("leave_chat", (roomName: string, done: () => void) => {
      rooms.get(roomName)?.delete(socket.id);
      socket.leave(roomName);
      done();
      console.log(`User left chat: ${socket.id}`);
    });

    // 연결 종료시 room 에서 퇴장
    socket.on("disconnecting", () => {
      socket.rooms.forEach((room) => {
        rooms.get(room)?.delete(socket.id);
        socket.leave(room);
      });
    });
  });
}
