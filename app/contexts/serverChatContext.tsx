import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { serverChatSocket } from "@/lib/socket";

interface ServerChatContextType {
  isConnected: boolean;
  rooms: [string, number][];
  mode: "list" | "chat";
  currentRoom: string;
  chatMessages: { message: string; userId: string }[];
  enterRoom: (roomName: string) => void;
  exitCurrentRoom: () => void;
  sendMessage: (message: string) => void;
}

export const ServerChatSocketContext = createContext<ServerChatContextType | null>(null);

export function ServerChatSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(serverChatSocket.connected);
  const [rooms, setRooms] = useState<[string, number][]>([]);
  const [mode, setMode] = useState<"list" | "chat">("list");
  const [currentRoom, setCurrentRoom] = useState("");
  const [chatMessages, setChatMessages] = useState<{ message: string; userId: string }[]>([]);

  useEffect(() => {
    serverChatSocket.emit("get_rooms");

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const setInitialRooms = (rooms: [string, number][]) => setRooms(rooms);
    const onReceiveMessage = (data: { message: string; userId: string }) => setChatMessages((prev) => [...prev, data]);

    const onJoinUser = (roomName: string) => {
      setCurrentRoom(roomName);
      setMode("chat");
    };

    serverChatSocket.on("connect", onConnect);
    serverChatSocket.on("disconnect", onDisconnect);
    serverChatSocket.on("room_list", setInitialRooms);
    serverChatSocket.on("receive_message", onReceiveMessage);
    serverChatSocket.on("user_joined", onJoinUser);

    // cleanup
    return () => {
      serverChatSocket.off("connect", onConnect);
      serverChatSocket.off("disconnect", onDisconnect);
      serverChatSocket.off("room_list", setInitialRooms);
      serverChatSocket.off("user_joined", onJoinUser);
      serverChatSocket.off("receive_message", onReceiveMessage);
    };
  }, []);

  const exitCurrentRoom = () =>
    serverChatSocket.emit("leave_chat", currentRoom, () => {
      setMode("list");
      setChatMessages([]);
      setCurrentRoom("");
    });

  const enterRoom = (roomName: string) =>
    serverChatSocket.emit("enter_room", roomName, (roomName: string) => {
      setMode("chat");
      setCurrentRoom(roomName);
    });

  const sendMessage = (message: string) => serverChatSocket.emit("new_message", { roomName: currentRoom, message });

  return (
    <ServerChatSocketContext.Provider
      value={{
        isConnected,
        rooms,
        mode,
        currentRoom,
        chatMessages,
        enterRoom,
        exitCurrentRoom,
        sendMessage,
      }}
    >
      {children}
    </ServerChatSocketContext.Provider>
  );
}

export const useServerChatSocketContext = () => {
  const context = useContext(ServerChatSocketContext);
  if (!context) throw new Error("useServerChatSocketContext error");

  return context;
};
