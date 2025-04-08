import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { videoChatSocket } from "@/lib/socket";

interface VideoChatContextType {
  isConnected: boolean;
  mode: "lobby" | "chat";
  currentRoom: string;
  myStream: MediaStream | null;
  otherStreams: Map<string, MediaStream>;
  currentMedia: MediaInfo;
  cameraList: Map<string, string>;
  micList: Map<string, string>;
  enterRoom: () => void;
  getCameraList: () => Promise<void>;
  getMicList: () => Promise<void>;
  exitCurrentRoom: () => void;
  changeAudioTrack: (id: string) => Promise<void>;
  changeVideoTrack: (id: string) => Promise<void>;
  changeCamera: (id: string) => void;
  changeMic: (id: string) => void;
}

interface MediaInfo {
  camera: {
    deviceId: string;
    label: string;
  } | null;
  mic: {
    deviceId: string;
    label: string;
  } | null;
}

export const VideoChatSocketContext = createContext<VideoChatContextType | null>(null);

export function VideoChatSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(videoChatSocket.connected);
  const [mode, setMode] = useState<"lobby" | "chat">("lobby");
  const [cameraList, setCameraList] = useState<Map<string, string>>(new Map());
  const [micList, setMicList] = useState<Map<string, string>>(new Map());
  const [myStream, setMyStream] = useState<MediaStream | null>(null);

  const [currentMedia, setCurrentMedia] = useState<MediaInfo>({ camera: null, mic: null });
  const [currentRoom, setCurrentRoom] = useState("");
  const [otherStreams, setOtherStreams] = useState<Map<string, MediaStream>>(new Map());
  const myPeerConnection = useRef<RTCPeerConnection | null>(null);

  function changeCamera(id: string) {
    const searchLabel = cameraList.get(id);
    if (!searchLabel) return;
    setCurrentMedia((prev) => ({ ...prev, camera: { deviceId: id, label: searchLabel } }));
  }

  function changeMic(id: string) {
    const searchLabel = micList.get(id);
    if (!searchLabel) return;
    setCurrentMedia((prev) => ({ ...prev, mic: { deviceId: id, label: searchLabel } }));
  }

  async function changeVideoTrack(id: string) {
    if (!myStream || !currentMedia.camera) return;

    // 기존 video track 정지
    myStream.getTracks().forEach((track) => track.stop());
    const audioTrack = myStream.getAudioTracks()[0];

    const selectedStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: id } },
      audio: audioTrack.getConstraints(),
    });

    setCurrentMedia((prev) => ({ ...prev, camera: { deviceId: id, label: selectedStream.getVideoTracks()[0].label } }));
    setMyStream(selectedStream);
    getCameraList();
  }

  async function changeAudioTrack(id: string) {
    if (!myStream || !currentMedia.mic) return;

    // 기존 video track 정지
    myStream.getTracks().forEach((track) => track.stop());
    const videoTrack = myStream.getVideoTracks()[0];

    const selectedStream = await navigator.mediaDevices.getUserMedia({
      video: videoTrack.getConstraints(),
      audio: { deviceId: { exact: id } },
    });

    setCurrentMedia((prev) => ({ ...prev, mic: { deviceId: id, label: selectedStream.getAudioTracks()[0].label } }));
    setMyStream(selectedStream);
    getMicList();
  }

  async function getCameraList() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameraList(
        new Map(devices.filter((device) => device.kind === "videoinput").map((d) => [d.deviceId, d.label])),
      );
    } catch (e) {
      console.log(e);
    }
  }

  async function getMicList() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMicList(
        new Map(
          devices
            .filter(
              (device) =>
                device.kind === "audioinput" && device.deviceId !== "default" && device.deviceId !== "communications",
            )
            .map((d) => [d.deviceId, d.label]),
        ),
      );
    } catch (e) {
      console.log(e);
    }
  }

  const exitCurrentRoom = useCallback(
    () =>
      videoChatSocket.emit("leave_chat", currentRoom, myStream?.id, () => {
        myPeerConnection.current?.close();
        setMode("lobby");
        setOtherStreams(new Map());
        setCurrentRoom("");
      }),
    [currentRoom, myStream?.id],
  );

  const enterRoom = async () => {
    if (!currentMedia.camera || !currentMedia.mic) return alert("장치가 선택되지 않았습니다.");
    alert("hi");

    // 선택된 미디어 기준 stream 생성
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: currentMedia.camera.deviceId } },
      audio: { deviceId: { exact: currentMedia.mic.deviceId } },
    });

    setMyStream(stream);

    if (myPeerConnection.current && stream) {
      console.log("add track");
      stream.getTracks().forEach((track) => myPeerConnection.current?.addTrack(track, stream));
    }

    videoChatSocket.emit("enter_room", (roomName: string) => {
      setMode("chat");
      setCurrentRoom(roomName);
    });
  };

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
      await pc.setLocalDescription(offer);
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
      console.log("onReceive ICE");
      pc.addIceCandidate(ice);
      console.log(pc);
    };

    const onLeaveUser = (streamId: string) => {
      console.log("leave User");
      setOtherStreams((prev) => {
        prev.delete(streamId);
        return prev;
      });
    };

    videoChatSocket.on("connect", onConnect);
    videoChatSocket.on("disconnect", onDisconnect);
    videoChatSocket.on("user_joined", onJoinUser);
    videoChatSocket.on("receive_offer", onReceiveOffer);
    videoChatSocket.on("receive_answer", onReceiveAnswer);
    videoChatSocket.on("receive_ice", onReceiveICE);
    videoChatSocket.on("user_leaved", onLeaveUser);

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

    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      console.log("send ice");
      videoChatSocket.emit("send_ice", currentRoom, event.candidate);
    };

    pc.ontrack = (event: RTCTrackEvent) => {
      console.log("Received new track", event);

      const [stream] = event.streams;
      const streamId = stream.id;

      if (!otherStreams.has(streamId)) {
        setOtherStreams((prev) => new Map(prev).set(streamId, stream));
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("내 상태 변화:", state);

      if (state === "disconnected" || state === "failed" || state === "closed") {
        exitCurrentRoom();
      }
    };
  }, [currentRoom, exitCurrentRoom, otherStreams]);

  return (
    <VideoChatSocketContext.Provider
      value={{
        isConnected,
        mode,
        currentRoom,
        myStream,
        currentMedia,
        otherStreams,
        cameraList,
        micList,
        getCameraList,
        getMicList,
        enterRoom,
        exitCurrentRoom,
        changeAudioTrack,
        changeVideoTrack,
        changeCamera,
        changeMic,
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
