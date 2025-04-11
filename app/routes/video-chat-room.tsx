/* eslint-disable jsx-a11y/media-has-caption */
import clsx from "clsx";
import { ChevronLeft, Mic, MicOff, SquareUserRound, Video, VideoOff } from "lucide-react";
import { type FC, useEffect, useRef } from "react";
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
  const { isConnected, mode, myStream, getMediaDevices, changeMediaDevice, enterRoom } = useVideoChatSocketContext();

  // initialize
  useEffect(() => {
    (async function init() {
      await Promise.all([getMediaDevices("audio"), getMediaDevices("video")]);
    })();
  }, [getMediaDevices]);

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
            <div className="mb-4 aspect-video">
              <VideoPlayer stream={myStream} />
            </div>
            <div className="flex space-x-3 mb-4">
              <CameraSelect onValueChange={(v) => changeMediaDevice("video", v)} />
              <MicSelect onValueChange={(v) => changeMediaDevice("audio", v)} />
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
  const { peerStreams, myStream, userList, isMicOn, isCameraOn, changeMediaDevice, exitCurrentRoom, handleDeviceMute } =
    useVideoChatSocketContext();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = myStream;
  }, [myStream]);

  console.log("peerStreams : ", peerStreams);
  console.log("myStream : ", myStream);
  console.log("user list : ", userList);

  return (
    <Card className="w-7xl">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex space-x-3">
            <Button type="button" size={null} variant="image-icon" onClick={exitCurrentRoom}>
              <ChevronLeft className="size-6" />
            </Button>

            <h1>화상 채팅방</h1>
          </div>
          <div>{userList.size}</div>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4">
        {/* my camera */}
        <div>
          <div className="mb-4 aspect-video">
            <VideoPlayer stream={myStream} />
          </div>

          <div className="flex justify-between">
            <div className="flex space-x-2">
              <CameraSelect onValueChange={(v) => changeMediaDevice("video", v)} />
              <MicSelect onValueChange={(v) => changeMediaDevice("audio", v)} />
            </div>

            <div className="flex space-x-2">
              <Button
                className="rounded-full size-9 bg-muted"
                size={null}
                variant="image-icon"
                onClick={() => handleDeviceMute("audio")}
              >
                {isMicOn ? <Mic className="size-6" /> : <MicOff className="size-6" />}
              </Button>
              <Button
                className="rounded-full size-9 bg-muted"
                size={null}
                variant="image-icon"
                onClick={() => handleDeviceMute("video")}
              >
                {isCameraOn ? <Video className="size-6" /> : <VideoOff className="size-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* other camera */}

        {[...userList].map(([peerId]) => {
          return peerStreams.has(peerId) ? (
            <div key={peerId} className="relative w-60 h-40">
              <VideoPlayer stream={peerStreams.get(peerId) as MediaStream} />
            </div>
          ) : (
            <></>
          );
        })}
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
  console.log(stream.getAudioTracks()[0]);

  const isAudioOn = stream.getAudioTracks()[0]?.enabled ?? false;
  const isVideoOn = stream.getVideoTracks()[0]?.enabled ?? false;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative size-full">
      <video ref={videoRef} autoPlay playsInline className={clsx("size-full shadow object-cover rounded-xl")} />

      {!isVideoOn && (
        <div className="absolute inset-0 bg-gray-500 flex items-center justify-center text-white text-xl font-bold rounded-xl">
          <SquareUserRound className="size-1/2" />
        </div>
      )}

      {!isAudioOn && (
        <div className="w-full h-1/4 bg-gradient-to-t from-black/60 to-transparent absolute end-0 -translate-y-full flex justify-end items-end p-3 rounded-b-xl">
          <div className="h-1/2">
            <MicOff color="white" className="size-full" />
          </div>
        </div>
      )}
    </div>
  );
};
