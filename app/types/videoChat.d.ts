type MediaType = "audio" | "video";

interface CurrentMediaInfo {
  video: MediaInfo;
  audio: MediaInfo;
}

type MediaInfo = { deviceId: string; label: string } | null;

interface MediaState {
  video: boolean;
  audio: boolean;
}
