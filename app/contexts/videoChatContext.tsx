import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { videoChatSocket } from "@/lib/socket";
import { getCurrentTrack } from "@/lib/utils";

interface VideoChatContextType {
  isConnected: boolean;
  mode: "lobby" | "chat";
  currentRoom: string;
  myStream: MediaStream;
  peerStreams: Map<string, MediaStream>;
  peerMediaStates: Map<string, MediaState>;
  currentMedia: MediaInfo;
  cameraList: Map<string, string>;
  micList: Map<string, string>;
  myPeerId: string;
  userList: Map<string, string>;
  isMicOn: boolean;
  isCameraOn: boolean;
  enterRoom: () => void;
  exitCurrentRoom: () => void;
  getMediaDevices: (type: MediaType) => Promise<void>;
  changeMediaDevice: (type: MediaType, deviceId: string) => Promise<void>;
  handleDeviceMute: (type: MediaType) => void;
}

export const VideoChatSocketContext = createContext<VideoChatContextType | null>(null);

export function VideoChatSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(videoChatSocket.connected);
  const [mode, setMode] = useState<"lobby" | "chat">("lobby");
  const [cameraList, setCameraList] = useState<Map<string, string>>(new Map());
  const [micList, setMicList] = useState<Map<string, string>>(new Map());
  const [myStream, setMyStream] = useState<MediaStream>(new MediaStream());
  const [myPeerId, setMyPeerId] = useState("");
  const [currentMedia, setCurrentMedia] = useState<MediaInfo>({ video: null, audio: null });
  const [currentRoom, setCurrentRoom] = useState("");
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerMediaStates, setPeerMediaStates] = useState(new Map<string, MediaState>());
  const [userList, setUserList] = useState<Map<string, string>>(new Map());
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  async function changeMediaDevice(type: MediaType, deviceId: string) {
    try {
      myStream.getTracks().forEach((track) => track.stop()); // 기존 트랙 정지

      // 반대쪽 트랙 백업
      const backupType: MediaType = type === "audio" ? "video" : "audio";
      const backupTrack = getCurrentTrack(myStream, backupType);

      // MediaStreamConstraints 설정
      const constraints: MediaStreamConstraints = { video: false, audio: false };
      constraints[type] = { deviceId: { exact: deviceId } };
      constraints[backupType] = backupTrack ? backupTrack.getConstraints() : false;

      // 변경된 디바이스 정보로 새로운 stream 생성
      const selectedStream = await navigator.mediaDevices.getUserMedia(constraints);

      // 변경된 camera track 저장
      const changedTrack = getCurrentTrack(selectedStream, type);
      console.log(changedTrack?.label);

      if (!changedTrack) throw new Error(`No changed ${type} track found`);
      changedTrack.enabled = type === "audio" ? isMicOn : isCameraOn;
      setMyStream(selectedStream);

      // peer 연결 반영
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === type);
        // setTrackHandler(changedTrack, peerId);
        sender?.replaceTrack(changedTrack);
      });

      // 현재 장치 정보 갱신
      setCurrentMedia((prev) => ({ ...prev, [type]: { deviceId, label: changedTrack.label } }));

      // 장치 목록 갱신
      getMediaDevices(type);
    } catch (e) {
      console.log(`change ${type} error`, e);
    }
  }

  const getMediaDevices = useCallback(async (type: MediaType) => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    if (type === "audio") {
      const filteredDevices = devices.filter(
        ({ kind, deviceId }) => kind === "audioinput" && deviceId !== "default" && deviceId !== "communications",
      );
      setMicList(new Map(filteredDevices.map(({ deviceId, label }) => [deviceId, label])));
    } else {
      const filteredDevices = devices.filter((device) => device.kind === "videoinput");
      setCameraList(new Map(filteredDevices.map(({ deviceId, label }) => [deviceId, label])));
    }
  }, []);

  const handleDeviceMute = (type: MediaType) => {
    try {
      const track = getCurrentTrack(myStream, type);
      if (!track) throw new Error(`No current ${type} track found`);
      track.enabled = !isCameraOn;

      const mediaState = { video: isCameraOn, audio: isMicOn };
      // device mute 여부 토글
      if (type === "audio") {
        setIsMicOn((prev) => !prev);
        mediaState.audio = !isMicOn;
      } else {
        setIsCameraOn((prev) => !prev);
        mediaState.video = !isCameraOn;
      }

      videoChatSocket.emit("set_media_state", currentRoom, myPeerId, mediaState);
    } catch (e) {
      console.log(`mute ${type} error`, e);
    }
  };

  function exitCurrentRoom() {
    // peerConnections 정리
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current = new Map(); // peerConnections 초기화

    // streams 정리
    peerStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
    setPeerStreams(new Map());

    // 기본 state 초기화
    setMode("lobby");
    setCurrentRoom("");
    setMyPeerId("");
    setCurrentMedia({ video: null, audio: null });

    videoChatSocket.emit("leave_chat", currentRoom, myPeerId);
  }

  const enterRoom = async () => {
    if (!(currentMedia.video && currentMedia.audio)) return alert("비디오와 오디오장치 모두 선택해주세요");

    const peerId = crypto.randomUUID(); // 사용자 고유 ID 생성

    console.log("[socket.emit]: enter_room");

    const mediaState = { video: isCameraOn, audio: isMicOn };
    videoChatSocket.emit("enter_room", peerId, mediaState, (roomName: string) => {
      setMyPeerId(peerId);
      setMode("chat");
      setCurrentRoom(roomName);
    });
  };

  const createPeerConnection = useCallback(
    (peerId: string) => {
      const pc = new RTCPeerConnection();
      myStream.getTracks().forEach((track) => {
        pc.addTrack(track, myStream);
      });

      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        console.log("[pc.onicecandidate]: ", event.candidate);
        videoChatSocket.emit("send_ice", currentRoom, myPeerId, event.candidate);
      };

      // video, audio 각각 트랙으로 오기 트랙별로 실행됨
      pc.ontrack = (event: RTCTrackEvent) => {
        console.log("[pc.ontrack]: ", event);

        const [stream] = event.streams; // 해당 track stream 가져옴 stream 에는 모든 track 이 포함되었습니다.
        console.log("PC received stream: ", stream);
        setPeerStreams((prev) => new Map(prev).set(peerId, stream));

        const videoTrack = getCurrentTrack(stream, "video");
        const audioTrack = getCurrentTrack(stream, "audio");

        setPeerMediaStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(peerId, { video: videoTrack?.enabled ?? false, audio: audioTrack?.enabled ?? false });
          return newMap;
        });
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("PC changed connectionState :", state);

        if (state === "connected") {
          setPeerStreams((prev) => {
            const newMap = new Map(prev);
            if (!prev.has(peerId)) newMap.set(peerId, new MediaStream());
            return newMap;
          });
        }

        // failed 된 경우 close 하여 메모리 내부 자원 정리, 메모리 누수 방지
        if (state === "failed") {
          peerConnections.current.get(peerId)?.close();
          console.log(peerConnections.current);
        }

        if (state === "closed") {
          // 연결이 끊긴 peerConnections 정리
          peerConnections.current.delete(peerId);
          console.log("peerConnections after closed pc", peerConnections.current);

          // 연결이 끊긴 peer 의 stream 정리
          setPeerStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
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
      console.log("[socket.on]: user_joined");

      const newPC = createPeerConnection(peerId); // 새로 입장한 사용자와의 PeerConnection 생성
      const offer = await newPC.createOffer(); // 새로 입장한 사용자에게 전달할 offer 생성
      await newPC.setLocalDescription(offer); // offer 저장
      peerConnections.current.set(peerId, newPC); // 새로 입장한 사용자의 peerId 기준으로 peerConnections에 저장
      console.log("PC after create offer :", newPC);

      console.log("[socket.emit]: send_offer");
      videoChatSocket.emit("send_offer", roomName, myPeerId, offer);
    };

    // 입장후 기존 사용자들에게 offer 전달받는 경우에 이벤트 핸들러
    const onReceiveOffer = async (roomName: string, peerId: string, offer: RTCSessionDescriptionInit) => {
      console.log("[socket.on]: receive_offer");

      const newPC = createPeerConnection(peerId); // 기존 사용자와의 PeerConnection 생성
      await newPC.setRemoteDescription(offer); // 기존 사용자에게 전달받은 offer 저장
      const answer = await newPC.createAnswer(); // 기존 사용자에게 전달할 answer 생성
      await newPC.setLocalDescription(answer); // answer 저장
      peerConnections.current.set(peerId, newPC); // 기존 사용자의 peerId 기준으로 peerConnections에 저장
      console.log("PC after receive offer & send answer: ", newPC);

      console.log("[socket.emit]: send_answer");
      videoChatSocket.emit("send_answer", roomName, myPeerId, answer);
    };

    // 기존 사용자가 새로 입장한 사용자에 answer 전달받는 경우에 이벤트 핸들러
    const onReceiveAnswer = async (peerId: string, answer: RTCSessionDescriptionInit) => {
      console.log("[socket.on]: receive_answer");

      const searchedPC = peerConnections.current.get(peerId); // answer 전달한 peerId 로 PC 조회
      if (!searchedPC) return console.log("해당 connection 이 존재하지 않습니다.");

      await searchedPC.setRemoteDescription(answer); // 새로 입장한 사용자에게 전달받은 answer 저장
      console.log("PC after receive answer: ", searchedPC);
    };

    const onReceiveICE = async (peerId: string, ice: RTCIceCandidate) => {
      console.log("[socket.on]: receive_ice");

      const searchedPC = peerConnections.current.get(peerId);
      if (!searchedPC) return;

      await searchedPC.addIceCandidate(ice); // PC 에 ICE candidate 저장
      console.log("PC after receive ICE: ", searchedPC);
    };

    // 다른 사용자 장치 상태 변경
    const onReceiveMediaState = (peerId: string, deviceState: MediaState) => {
      console.log("[socket.on]: receive_media_state");

      setPeerMediaStates((prev) => {
        const newMap = new Map(prev);
        newMap.set(peerId, deviceState);
        return newMap;
      });
    };

    const onLeaveUser = (peerId: string) => {
      console.log("[socket.on]: user_leaved");

      peerConnections.current.delete(peerId);
      setPeerStreams((prev) => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
    };

    const onChangedUsers = (userList: [string, string][]) => {
      console.log("[socket.on]: users_changed");
      console.log("users changed: ", userList);
      setUserList(new Map(userList));
    };

    videoChatSocket.on("connect", onConnect);
    videoChatSocket.on("disconnect", onDisconnect);
    videoChatSocket.on("user_joined", onJoinUser);
    videoChatSocket.on("receive_offer", onReceiveOffer);
    videoChatSocket.on("receive_answer", onReceiveAnswer);
    videoChatSocket.on("receive_ice", onReceiveICE);
    videoChatSocket.on("user_leaved", onLeaveUser);
    videoChatSocket.on("users_changed", onChangedUsers);
    videoChatSocket.on("receive_media_state", onReceiveMediaState);

    // cleanup
    return () => {
      videoChatSocket.off("connect", onConnect);
      videoChatSocket.off("disconnect", onDisconnect);
      videoChatSocket.off("user_joined", onJoinUser);
      videoChatSocket.off("receive_offer", onReceiveOffer);
      videoChatSocket.off("receive_answer", onReceiveAnswer);
      videoChatSocket.off("receive_ice", onReceiveICE);
      videoChatSocket.off("users_changed", onChangedUsers);
      videoChatSocket.off("receive_media_state", onReceiveMediaState);
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
        peerMediaStates,
        cameraList,
        micList,
        myPeerId,
        userList,
        isMicOn,
        isCameraOn,
        getMediaDevices,
        enterRoom,
        exitCurrentRoom,
        changeMediaDevice,
        handleDeviceMute,
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
