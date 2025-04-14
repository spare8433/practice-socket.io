import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentTrack(stream: MediaStream, type: "audio" | "video") {
  const tracks = type === "video" ? stream.getVideoTracks() : stream.getAudioTracks();
  return tracks.length > 0 ? tracks[0] : undefined;
}
