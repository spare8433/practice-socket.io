/* eslint-disable jsx-a11y/media-has-caption */
import { ChevronLeft, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useVideoChatSocketContext, VideoChatSocketProvider } from "@/contexts/videoChatContext";

export default function VideoChatRoom() {
  return (
    <VideoChatSocketProvider>
      <VideoChatRoomContent />
    </VideoChatSocketProvider>
  );
}

const VideoChatRoomContent = () => {
  const navigate = useNavigate();
  const { isConnected, mode, enterRoom, exitCurrentRoom } = useVideoChatSocketContext();

  return (
    <>
      {mode === "lobby" && (
        <Card className="w-2xl">
          <CardHeader className="flex justify-between items-center">
            <div className="flex space-x-3">
              <Button type="button" size={null} variant="image-icon" onClick={() => navigate("/")}>
                <ChevronLeft className="size-6" />
              </Button>

              <h1>화상 채팅방 로비</h1>
            </div>
            <p>{isConnected ? "연결됨" : "연결끊김"}</p>
          </CardHeader>

          <CardContent>
            <Button type="button" className="w-full" onClick={enterRoom}>
              입장
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === "chat" && <VideChat />}
    </>
  );
};

const VideChat = () => {
  const navigate = useNavigate();
  const { otherStreams, exitCurrentRoom } = useVideoChatSocketContext();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [myStream, setMyStream] = useState<MediaStream>();
  const [currentCamera, setCurrentCamera] = useState<{ deviceId: string; label: string } | null>(null);
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const [isMicOff, setIsMicOff] = useState(false);
  const [isCameraOff, setCameraOff] = useState(false);

  const setCamera = async (deviceId: string) => {
    try {
      if (!videoRef.current) return;

      // 기존 스트림이 있으면 트랙 중지
      if (myStream) myStream.getTracks().forEach((track) => track.stop());

      // 선택된 캠 기준 스트림 가져오기
      const selectedStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { deviceId: { exact: deviceId } },
      });

      const videoTrack = selectedStream.getVideoTracks()[0];
      videoTrack.enabled = !setCameraOff;

      selectedStream.getAudioTracks().forEach((track) => (track.enabled = !setIsMicOff));
      videoRef.current.srcObject = selectedStream;

      setCurrentCamera({ deviceId, label: videoTrack.label });
      setMyStream(selectedStream);

      await getCameras();
    } catch (e) {
      console.log(e);
    }
  };

  async function getCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameraList(devices.filter((device) => device.kind === "videoinput"));
    } catch (e) {
      console.log(e);
    }
  }

  async function initializeStream() {
    try {
      const myStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      if (!videoRef.current) return;
      videoRef.current.srcObject = myStream;

      const track = myStream.getVideoTracks()[0];
      setMyStream(myStream);
      setCurrentCamera({ deviceId: track.id, label: track.label });
    } catch (e) {
      console.log(e);
    }
  }

  // initialize
  useEffect(() => {
    (async function init() {
      await Promise.all([getCameras(), initializeStream()]);
    })();
  }, []);

  const handleCameraClick = () => {
    if (!myStream) return;
    myStream.getVideoTracks().forEach((track) => (track.enabled = isCameraOff));
    setCameraOff((prev) => !prev);
  };

  const handleMuteClick = () => {
    if (!myStream) return;
    myStream.getAudioTracks().forEach((track) => (track.enabled = isMicOff));
    setIsMicOff((prev) => !prev);
  };
  return (
    <Card className="w-2xl">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex space-x-3">
            <Button type="button" size={null} variant="image-icon" onClick={() => navigate("/")}>
              <ChevronLeft className="size-6" />
            </Button>

            <h1>화상 채팅방</h1>
          </div>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4">
        {/* my camera */}
        <div>
          <video className="w-full shadow" ref={videoRef} autoPlay playsInline />

          <div className="flex justify-between">
            <Select value={currentCamera?.deviceId} onValueChange={(v) => setCamera(v)}>
              <SelectTrigger>{currentCamera?.label ?? "select camera"}</SelectTrigger>
              <SelectContent>
                {cameraList.map(({ deviceId, label }) => (
                  <SelectItem key={deviceId} value={deviceId}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex space-x-2">
              <Button
                className="rounded-full size-9 bg-muted"
                size={null}
                variant="image-icon"
                onClick={handleMuteClick}
              >
                {isMicOff ? <MicOff className="size-6" /> : <Mic className="size-6" />}
              </Button>
              <Button
                className="rounded-full size-9 bg-muted"
                size={null}
                variant="image-icon"
                onClick={handleCameraClick}
              >
                {isCameraOff ? <VideoOff className="size-6" /> : <Video className="size-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* other camera */}
        {[...otherStreams].map(([id, stream]) => (
          <video
            className="w-full shadow"
            key={id}
            ref={(el) => {
              if (el) el.srcObject = stream;
            }}
            autoPlay
            playsInline
          />
        ))}
      </CardContent>
    </Card>
  );
};
