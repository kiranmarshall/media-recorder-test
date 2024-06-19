const videoTypes = ["webm", "ogg", "mp4", "x-matroska"];
const audioTypes = ["webm", "ogg", "mp3", "x-matroska"];
const codecs = [
  "should-not-be-supported",
  "vp9",
  "vp9.0",
  "vp8",
  "vp8.0",
  "avc1",
  "av1",
  "h265",
  "h.265",
  "h264",
  "h.264",
  "opus",
  "pcm",
  "aac",
  "mpeg",
  "mp4a",
];

export function getSupportedMimeTypes(media: "audio" | "video") {
  const types = media === "audio" ? audioTypes : videoTypes;

  const isSupported = MediaRecorder.isTypeSupported;
  const supported: string[] = [];

  types.forEach((type) => {
    const mimeType = `${media}/${type}`;

    codecs.forEach((codec) =>
      [`${mimeType};codecs=${codec}`, `${mimeType};codecs=${codec.toUpperCase()}`].forEach(
        (variation) => {
          if (isSupported(variation)) supported.push(variation);
        }
      )
    );

    if (isSupported(mimeType)) supported.push(mimeType);
  });

  return supported;
}
