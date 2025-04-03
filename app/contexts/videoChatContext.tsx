import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";

import { videoChatSocket } from "@/lib/socket";

interface VideoChatContextType {
  isConnected: boolean;
  mode: "lobby" | "chat";
  currentRoom: string;
  otherStreams: Map<string, MediaStream>;
  enterRoom: () => void;
  exitCurrentRoom: () => void;
}

export const VideoChatSocketContext = createContext<VideoChatContextType | null>(null);

export function VideoChatSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(videoChatSocket.connected);
  const [mode, setMode] = useState<"lobby" | "chat">("lobby");
  const [currentRoom, setCurrentRoom] = useState("");
  const [otherStreams, setOtherStreams] = useState<Map<string, MediaStream>>(new Map());
  // const [myPeerConnection] = useState(() => new RTCPeerConnection());
  const myPeerConnection = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const pc = new RTCPeerConnection();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onJoinUser = async (roomName: string) => {
      console.log("someone join");
      setCurrentRoom(roomName);
      setMode("chat");

      console.log(pc);

      const offer = await pc.createOffer();
      pc.setLocalDescription(offer);
      console.log("send offer");
      videoChatSocket.emit("send_offer", roomName, offer);
    };

    const onReceiveOffer = async (roomName: string, offer: RTCSessionDescriptionInit) => {
      console.log("onReceive offer");

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(pc);
      console.log("send answer");
      videoChatSocket.emit("send_answer", roomName, answer);
    };

    const onReceiveAnswer = (answer: RTCSessionDescriptionInit) => {
      console.log("onReceive answer");
      pc.setRemoteDescription(answer);
      console.log(pc);
    };

    const onReceiveICE = (ice: RTCIceCandidate) => {
      if (!pc) return;
      console.log("onReceive ICE");
      pc.addIceCandidate(ice);
      console.log(pc);
    };

    videoChatSocket.on("connect", onConnect);
    videoChatSocket.on("disconnect", onDisconnect);
    videoChatSocket.on("user_joined", onJoinUser);
    videoChatSocket.on("receive_offer", onReceiveOffer);
    videoChatSocket.on("receive_answer", onReceiveAnswer);
    videoChatSocket.on("receive_ice", onReceiveICE);

    myPeerConnection.current = pc;

    // cleanup
    return () => {
      videoChatSocket.off("connect", onConnect);
      videoChatSocket.off("disconnect", onDisconnect);
      videoChatSocket.off("user_joined", onJoinUser);
      videoChatSocket.off("receive_offer", onReceiveOffer);
      videoChatSocket.off("receive_answer", onReceiveAnswer);
      videoChatSocket.off("receive_ice", onReceiveICE);
      pc.close();
    };
  }, []);

  useEffect(() => {
    if (!myPeerConnection.current) return;

    const pc = myPeerConnection.current;

    // ✅ ICE Candidate 이벤트 등록
    const handleICE = (event: RTCPeerConnectionIceEvent) => {
      console.log("set icecandidate event handler");
      console.log("send ice");
      videoChatSocket.emit("send_ice", event.candidate, currentRoom);
    };
    pc.addEventListener("icecandidate", handleICE);

    const handleTrack = (event: RTCTrackEvent) => {
      console.log("Received new track", event.streams[0]);
      const [stream] = event.streams;
      const peerId = event.track.id;

      if (!otherStreams.has(peerId)) {
        otherStreams.set(peerId, new MediaStream());
      }

      setOtherStreams((prev) => new Map(prev).set(peerId, stream));
    };
    pc.addEventListener("track", handleTrack);

    return () => {
      pc.removeEventListener("icecandidate", handleICE);
      pc.removeEventListener("track", handleTrack);
    };
  }, [myPeerConnection, currentRoom, otherStreams]);

  const exitCurrentRoom = () =>
    videoChatSocket.emit("leave_chat", currentRoom, () => {
      setMode("lobby");
      setOtherStreams(new Map());
      setCurrentRoom("");
    });

  const enterRoom = () =>
    videoChatSocket.emit("enter_room", (roomName: string) => {
      setMode("chat");
      setCurrentRoom(roomName);
    });

  if (!myPeerConnection) return;

  return (
    <VideoChatSocketContext.Provider
      value={{
        isConnected,
        mode,
        currentRoom,
        otherStreams,
        enterRoom,
        exitCurrentRoom,
      }}
    >
      {children}
    </VideoChatSocketContext.Provider>
  );
}

export const useVideoChatSocketContext = () => {
  const context = useContext(VideoChatSocketContext);
  if (!context) throw new Error("useVideoChatSocketContext error");

  return context;
};
