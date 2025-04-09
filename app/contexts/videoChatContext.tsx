import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { videoChatSocket } from "@/lib/socket";

interface VideoChatContextType {
  isConnected: boolean;
  mode: "lobby" | "chat";
  currentRoom: string;
  myStream: MediaStream | null;
  peerStreams: Map<string, MediaStream>;
  currentMedia: MediaInfo;
  cameraList: Map<string, string>;
  micList: Map<string, string>;
  myPeerId: string;
  enterRoom: () => void;
  getCameraList: () => Promise<void>;
  getMicList: () => Promise<void>;
  exitCurrentRoom: () => void;
  changeMic: (id: string) => Promise<void>;
  changeCamera: (id: string) => Promise<void>;
}

interface MediaInfo {
  camera: { deviceId: string; label: string } | null;
  mic: { deviceId: string; label: string } | null;
}

export const VideoChatSocketContext = createContext<VideoChatContextType | null>(null);

export function VideoChatSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(videoChatSocket.connected);
  const [mode, setMode] = useState<"lobby" | "chat">("lobby");
  const [cameraList, setCameraList] = useState<Map<string, string>>(new Map());
  const [micList, setMicList] = useState<Map<string, string>>(new Map());
  const [myStream, setMyStream] = useState<MediaStream>(new MediaStream());
  const [myPeerId, setMyPeerId] = useState("");
  const [currentMedia, setCurrentMedia] = useState<MediaInfo>({ camera: null, mic: null });
  const [currentRoom, setCurrentRoom] = useState("");
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream>>(new Map());

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  async function changeCamera(id: string) {
    // 기존 track 정지
    myStream.getTracks().forEach((track) => track.stop());

    // 현재 audio track 저장
    const audioTrack = myStream.getAudioTracks()[0];

    const selectedStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: id } },
      audio: audioTrack ? audioTrack.getConstraints() : false,
    });

    console.log(selectedStream);

    setMyStream(selectedStream);
    setCurrentMedia((prev) => ({ ...prev, camera: { deviceId: id, label: selectedStream.getVideoTracks()[0].label } }));
    getCameraList();
  }

  async function changeMic(id: string) {
    // 기존 track 정지
    myStream.getTracks().forEach((track) => track.stop());

    // 현재 video track 저장
    const videoTrack = myStream.getVideoTracks()[0];

    const selectedStream = await navigator.mediaDevices.getUserMedia({
      video: videoTrack ? videoTrack.getConstraints() : false,
      audio: { deviceId: { exact: id } },
    });

    setCurrentMedia((prev) => ({ ...prev, mic: { deviceId: id, label: selectedStream.getAudioTracks()[0].label } }));
    setMyStream(selectedStream);
    getMicList();
  }

  const getCameraList = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameraList(
        new Map(devices.filter((device) => device.kind === "videoinput").map((d) => [d.deviceId, d.label])),
      );
    } catch (e) {
      console.log(e);
    }
  }, []);

  const getMicList = useCallback(async () => {
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
  }, []);

  function exitCurrentRoom() {
    videoChatSocket.emit("leave_chat", currentRoom, myPeerId, () => {
      // peerConnections 정리
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current = new Map(); // peerConnections 초기화
      // streams 정리
      peerStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop));
      setPeerStreams(new Map());

      // 기본 state 초기화
      setMode("lobby");
      setCurrentRoom("");
      setMyPeerId("");
      setCurrentMedia({ camera: null, mic: null });
    });
  }

  const enterRoom = async () => {
    // 선택된 미디어 장비가 하나라도 있는 경우
    if (currentMedia.camera || currentMedia.mic) {
      // 선택된 미디어 기준 stream 생성
      const stream = await navigator.mediaDevices.getUserMedia({
        video: currentMedia.camera ? { deviceId: { exact: currentMedia.camera.deviceId } } : true,
        audio: currentMedia.mic ? { deviceId: { exact: currentMedia.mic?.deviceId } } : false,
      });
      setMyStream(stream);
    }

    const peerId = crypto.randomUUID(); // 사용자 고유 ID 생성

    videoChatSocket.emit("enter_room", peerId, (roomName: string) => {
      setMyPeerId(peerId);
      setMode("chat");
      setCurrentRoom(roomName);
    });
  };

  const createPeerConnection = useCallback(
    (peerId: string) => {
      const pc = new RTCPeerConnection();
      myStream.getTracks().forEach((track) => pc.addTrack(track, myStream));

      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        console.log("send ice");
        videoChatSocket.emit("send_ice", currentRoom, myPeerId, event.candidate);
      };

      // video, audio 각각 트랙으로 오기 트랙별로 실행됨
      pc.ontrack = (event: RTCTrackEvent) => {
        console.log("Received new track", event);

        const [stream] = event.streams; // 해당 track stream 가져옴 stream 에는 모든 track 이 포함되었습니다.
        console.log(stream);

        setPeerStreams((prev) => new Map(prev).set(peerId, stream));
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("내 상태 변화:", state);

        if (state === "failed" || state === "closed") {
          console.log("check");

          // 연결이 끊긴 peerConnections 정리
          peerConnections.current.delete(peerId);
          console.log(peerConnections.current);

          // failed 된 경우 close 하여 메모리 내부 자원 정리, 메모리 누수 방지
          if (state === "failed") {
            peerConnections.current.get(peerId)?.close();
            console.log(peerConnections.current);
          }

          // 연결이 끊긴 peer 의 stream 정리
          setPeerStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return prev;
          });
        }
      };

      return pc;
    },
    [currentRoom, myPeerId, myStream],
  );

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    // 새로운 사용자 입장시 이벤트 핸들러
    const onJoinUser = async (roomName: string, peerId: string) => {
      console.log("someone join");

      // 새로운 사용자와 PeerConnection 생성
      const newPC = createPeerConnection(peerId);

      // 현재 스트림의 트랙 목록 추가
      console.log("add my track on peer connection");
      // myStream.getTracks().forEach((track) => newPC.addTrack(track, myStream));

      const offer = await newPC.createOffer(); // 새로 입장한 사용자에게 전달할 offer 생성
      await newPC.setLocalDescription(offer); // offer 저장
      peerConnections.current.set(peerId, newPC); //  새로운 사용자의 peerId 기준으로 peerConnections에 저장
      console.log(newPC);

      console.log("send offer");
      videoChatSocket.emit("send_offer", roomName, myPeerId, offer, () => {
        setCurrentRoom(roomName);
        setMode("chat");
      });
    };

    // 입장후 기존 사용자들에게 offer 전달받는 경우에 이벤트 핸들러
    const onReceiveOffer = async (roomName: string, peerId: string, offer: RTCSessionDescriptionInit) => {
      console.log("onReceive offer");

      const newPC = createPeerConnection(peerId);

      await newPC.setRemoteDescription(offer); // 기존 사용자에게 전달받은 offer 저장
      const answer = await newPC.createAnswer(); // 기존 사용자에게 전달할 answer 생성
      await newPC.setLocalDescription(answer); // answer 저장

      console.log(newPC);
      peerConnections.current.set(peerId, newPC);

      console.log("send answer");
      videoChatSocket.emit("send_answer", roomName, myPeerId, answer);
    };

    // 기존 사용자가 새로 입장한 사용자에 answer 전달받는 경우에 이벤트 핸들러
    const onReceiveAnswer = (peerId: string, answer: RTCSessionDescriptionInit) => {
      console.log("onReceive answer");

      console.log(peerConnections.current);
      console.log(peerId);

      const searchedPC = peerConnections.current.get(peerId);
      if (!searchedPC) return;

      searchedPC.setRemoteDescription(answer);
      console.log(searchedPC);
    };

    const onReceiveICE = (peerId: string, ice: RTCIceCandidate) => {
      console.log("onReceive ICE");

      const searchedPC = peerConnections.current.get(peerId);
      if (!searchedPC) return;

      console.log(searchedPC);
      searchedPC.addIceCandidate(ice);
    };

    const onLeaveUser = (peerId: string) => {
      console.log("leave User");
      setPeerStreams((prev) => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
    };

    videoChatSocket.on("connect", onConnect);
    videoChatSocket.on("disconnect", onDisconnect);
    videoChatSocket.on("user_joined", onJoinUser);
    videoChatSocket.on("receive_offer", onReceiveOffer);
    videoChatSocket.on("receive_answer", onReceiveAnswer);
    videoChatSocket.on("receive_ice", onReceiveICE);
    videoChatSocket.on("user_leaved", onLeaveUser);

    // cleanup
    return () => {
      videoChatSocket.off("connect", onConnect);
      videoChatSocket.off("disconnect", onDisconnect);
      videoChatSocket.off("user_joined", onJoinUser);
      videoChatSocket.off("receive_offer", onReceiveOffer);
      videoChatSocket.off("receive_answer", onReceiveAnswer);
      videoChatSocket.off("receive_ice", onReceiveICE);
    };
  }, [createPeerConnection, myPeerId, myStream]);

  return (
    <VideoChatSocketContext.Provider
      value={{
        isConnected,
        mode,
        currentRoom,
        myStream,
        currentMedia,
        peerStreams,
        cameraList,
        micList,
        myPeerId,
        getCameraList,
        getMicList,
        enterRoom,
        exitCurrentRoom,
        changeMic,
        changeCamera,
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
