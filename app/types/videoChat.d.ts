type MediaType = "audio" | "video";

interface MediaInfo {
  video: { deviceId: string; label: string } | null;
  audio: { deviceId: string; label: string } | null;
}

interface MediaState {
  video: boolean;
  audio: boolean;
}
