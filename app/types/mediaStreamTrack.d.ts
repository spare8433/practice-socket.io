declare global {
  interface MediaStreamTrack {
    readonly kind: "audio" | "video";
  }
}

export {};
