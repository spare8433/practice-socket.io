/* eslint-disable jsx-a11y/media-has-caption */
import { ChevronLeft, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
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
  const { isConnected, mode, getCameraList, getMicList, changeCamera, changeMic, enterRoom } =
    useVideoChatSocketContext();

  // initialize
  useEffect(() => {
    (async function init() {
      await Promise.all([getCameraList(), getMicList()]);
    })();
  }, [getCameraList, getMicList]);

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
            <div className="flex space-x-3 mb-4">
              <CameraSelect onValueChange={changeCamera} />
              <MicSelect onValueChange={changeMic} />
            </div>

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
  const { peerStreams, myStream, changeCamera, changeMic, exitCurrentRoom } = useVideoChatSocketContext();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isMicOff, setIsMicOff] = useState(false);
  const [isCameraOff, setCameraOff] = useState(false);

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

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = myStream;
  }, [myStream]);

  console.log(peerStreams);
  console.log(myStream);

  return (
    <Card className="w-2xl">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex space-x-3">
            <Button type="button" size={null} variant="image-icon" onClick={exitCurrentRoom}>
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
            <div className="flex space-x-2">
              <CameraSelect onValueChange={changeCamera} />
              <MicSelect onValueChange={changeMic} />
            </div>

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
        {[...peerStreams].map(([id, stream]) => (
          <VideoPlayer key={id} stream={stream} />
        ))}
      </CardContent>
    </Card>
  );
};

const CameraSelect = ({ onValueChange }: { onValueChange: (v: string) => void }) => {
  const {
    cameraList,
    currentMedia: { camera },
  } = useVideoChatSocketContext();

  return (
    <Select defaultValue={camera?.deviceId} onValueChange={(v) => onValueChange(v)}>
      <SelectTrigger>{camera ? cameraList.get(camera.deviceId) : "select camera"}</SelectTrigger>
      <SelectContent>
        {Array.from(cameraList).map(([deviceId, label]) => (
          <SelectItem key={deviceId} value={deviceId}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const MicSelect = ({ onValueChange }: { onValueChange: (v: string) => void }) => {
  const {
    micList,
    currentMedia: { mic },
  } = useVideoChatSocketContext();

  return (
    <Select defaultValue={mic?.deviceId} onValueChange={(v) => onValueChange(v)}>
      <SelectTrigger>{mic?.label ?? "select mic"}</SelectTrigger>
      <SelectContent>
        {Array.from(micList).map(([deviceId, label]) => (
          <SelectItem key={deviceId} value={deviceId}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const VideoPlayer: FC<{ stream: MediaStream }> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  console.log(stream);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline className="w-1/2 shadow" />
    </div>
  );
};
