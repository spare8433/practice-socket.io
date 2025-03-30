import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { chatSocket } from "@/lib/socket";

interface ChatContextType {
  isConnected: boolean;
  rooms: [string, number][];
  mode: "list" | "chat";
  currentRoom: string;
  chatMessages: { message: string; userId: string }[];
  enterRoom: (roomName: string) => void;
  exitCurrentRoom: () => void;
  sendMessage: (message: string) => void;
}

export const ChatSocketContext = createContext<ChatContextType | null>(null);

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(chatSocket.connected);
  const [rooms, setRooms] = useState<[string, number][]>([]);
  const [mode, setMode] = useState<"list" | "chat">("list");
  const [currentRoom, setCurrentRoom] = useState("");
  const [chatMessages, setChatMessages] = useState<{ message: string; userId: string }[]>([]);

  useEffect(() => {
    chatSocket.emit("get_rooms");

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const setInitialRooms = (rooms: [string, number][]) => setRooms(rooms);
    const onReceiveMessage = (data: { message: string; userId: string }) => setChatMessages((prev) => [...prev, data]);

    const onJoinUser = (roomName: string) => {
      setCurrentRoom(roomName);
      setMode("chat");
    };

    chatSocket.on("connect", onConnect);
    chatSocket.on("disconnect", onDisconnect);
    chatSocket.on("room_list", setInitialRooms);
    chatSocket.on("receive_message", onReceiveMessage);
    chatSocket.on("user_joined", onJoinUser);

    // cleanup
    return () => {
      chatSocket.off("connect", onConnect);
      chatSocket.off("disconnect", onDisconnect);
      chatSocket.off("room_list", setInitialRooms);
      chatSocket.off("user_joined", onJoinUser);
      chatSocket.off("receive_message", onReceiveMessage);
    };
  }, []);

  const exitCurrentRoom = () =>
    chatSocket.emit("leave_chat", currentRoom, () => {
      setMode("list");
      setChatMessages([]);
      setCurrentRoom("");
    });

  const enterRoom = (roomName: string) =>
    chatSocket.emit("enter_room", roomName, (roomName: string) => {
      setMode("chat");
      setCurrentRoom(roomName);
    });

  const sendMessage = (message: string) => chatSocket.emit("new_message", { roomName: currentRoom, message });

  return (
    <ChatSocketContext.Provider
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
    </ChatSocketContext.Provider>
  );
}

export const useChatSocketContext = () => {
  const context = useContext(ChatSocketContext);
  if (!context) throw new Error("useChatSocketContext error");

  return context;
};
