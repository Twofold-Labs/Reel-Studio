// Output formats. `init` preset = the closest HyperFrames --resolution preset; we patch the canvas when it differs.
export const FORMATS = {
  feed_4x5:   { w: 1080, h: 1350, label: "Instagram feed 4:5",  initPreset: "square",   destination: "instagram-feed",  safe: { top: 110, bottom: 110, side: 60 } },
  reel_9x16:  { w: 1080, h: 1920, label: "Reel / Story 9:16",   initPreset: "portrait", destination: "instagram-reels", safe: { top: 250, bottom: 340, side: 60 } },
  square_1x1: { w: 1080, h: 1080, label: "Square 1:1",          initPreset: "square",   destination: "social-feed",     safe: { top: 80,  bottom: 80,  side: 60 } },
};
export const aspect = (f) => `${FORMATS[f].w}x${FORMATS[f].h}`;
