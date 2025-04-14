/* eslint-disable jsx-a11y/media-has-caption */
import clsx from "clsx";
import { ChevronLeft, Mic, MicOff, SquareUserRound, Video, VideoOff } from "lucide-react";
import { type FC, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useVideoChatSocketContext, VideoChatSocketProvider } from "@/contexts/videoChatContext";
import { cn, getCurrentTrack } from "@/lib/utils";

export default function VideoChatRoom() {
  return (
    <VideoChatSocketProvider>
      <VideoChatRoomContent />
    </VideoChatSocketProvider>
  );
}

const VideoChatRoomContent = () => {
  const navigate = useNavigate();
  const { isConnected, mode, myStream, isMicOn, isCameraOn, getMediaDevices, changeMediaDevice, enterRoom } =
    useVideoChatSocketContext();

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
              <VideoPlayer stream={myStream} isAudioOn={isMicOn} isVideoOn={isCameraOn} />
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
  const {
    peerStreams,
    myStream,
    userList,
    myPeerId,
    isMicOn,
    isCameraOn,
    peerMediaStates,
    changeMediaDevice,
    exitCurrentRoom,
    handleDeviceMute,
  } = useVideoChatSocketContext();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = myStream;
  }, [myStream]);

  // console.log("peerStreams : ", peerStreams);
  // console.log("peerMediaStates : ", peerMediaStates);
  // console.log("myStream : ", myStream);
  // console.log("user list : ", userList);

  const getGridClassName = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count <= 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3";
    if (count <= 9) return "grid-cols-3";
    if (count <= 12) return "grid-cols-3 md:grid-cols-4";
    if (count <= 16) return "grid-cols-4";
    return "grid-cols-4 md:grid-cols-5";
  };

  return (
    <div className="size-full flex flex-col">
      {/* content header */}
      <div className="flex space-x-3 h-14 items-center px-4">
        <Button type="button" size={null} variant="image-icon" onClick={exitCurrentRoom}>
          <ChevronLeft className="size-6" />
        </Button>

        <h1>화상 채팅방</h1>
      </div>

      {/* content */}
      <div className="flex flex-col flex-1 p-4 border-y-2">
        {/* main view */}
        <div
          className={cn(
            "grid gap-2.5 auto-rows-fr grid-cols-1 w-full flex-1 items-center",
            getGridClassName(userList.size),
          )}
        >
          <div className="aspect-video">
            <VideoPlayer stream={myStream} isAudioOn={isMicOn} isVideoOn={isCameraOn} />
          </div>

          {[...userList].map(([peerId]) => {
            if (peerStreams.has(peerId) && peerMediaStates.has(peerId) && myPeerId !== peerId) {
              const { audio, video } = peerMediaStates.get(peerId)!;
              return (
                <div key={peerId} className="aspect-video">
                  <VideoPlayer stream={peerStreams.get(peerId) as MediaStream} isAudioOn={audio} isVideoOn={video} />
                </div>
              );
            } else return <></>;
          })}
        </div>
      </div>

      {/* content footer */}
      <div className="flex gap-x-4 h-16 px-4 justify-center items-center">
        <CameraSelect onValueChange={(v) => changeMediaDevice("video", v)} />
        <MicSelect onValueChange={(v) => changeMediaDevice("audio", v)} />
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
  );
};

const CameraSelect = ({ onValueChange }: { onValueChange: (v: string) => void }) => {
  const {
    cameraList,
    currentMedia: { video },
  } = useVideoChatSocketContext();

  return (
    <Select defaultValue={video?.deviceId} onValueChange={(v) => onValueChange(v)}>
      <SelectTrigger>{video ? video.label : "select camera"}</SelectTrigger>
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
    currentMedia: { audio },
  } = useVideoChatSocketContext();

  return (
    <Select defaultValue={audio?.deviceId} onValueChange={(v) => onValueChange(v)}>
      <SelectTrigger>{audio?.label ?? "select mic"}</SelectTrigger>
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

const VideoPlayer: FC<{ stream: MediaStream; isAudioOn: boolean; isVideoOn: boolean }> = ({
  stream,
  isAudioOn,
  isVideoOn,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const videoTrack = getCurrentTrack(stream, "video");
  const audioTrack = getCurrentTrack(stream, "audio");

  return (
    <div className="relative size-full">
      <video ref={videoRef} autoPlay playsInline className={clsx("size-full shadow-2xl object-cover rounded-xl")} />

      {(!videoTrack || !isVideoOn) && (
        <div className="absolute inset-0 bg-gray-500 flex items-center justify-center text-white text-xl font-bold rounded-xl">
          <SquareUserRound className="size-1/2" />
        </div>
      )}

      {(!audioTrack || !isAudioOn) && (
        <div className="max- h-1/4 absolute max-w-14 max-h-14 right-2 bottom-2 flex justify-end items-end p-2 rounded-xl bg-gray-500/75">
          <MicOff color="white" className="size-full" />
        </div>
      )}
    </div>
  );
};
