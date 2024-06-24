<script lang="ts">
  import "./app.css";
  import { onMount } from "svelte";
  import { getSupportedMimeTypes } from "./lib/utils";

  function updateLogs(log: string) {
    console.log(log);
    logs = [...logs, log];
  }

  onMount(async () => {
    updateLogs("page loaded");
  });

  let height = 1080;
  let width = 1920;

  let inputSources: MediaDeviceInfo[] = [];
  let selectedInput: MediaDeviceInfo;

  let hasCameraPermissions = false;
  let inputsFetched = false;

  async function getInputSources() {
    if (!hasCameraPermissions) {
      await navigator.mediaDevices.getUserMedia({ video: true });
      hasCameraPermissions = true;
    }

    inputSources = (await navigator.mediaDevices.enumerateDevices()).filter((device) => {
      return device.kind === "videoinput";
    });
    inputsFetched = true;

    updateLogs("input sources fetched");
  }

  let mimeTypes = getSupportedMimeTypes("video");

  let selectedMimetype = "Select mimeType";
  let mimeTypeSupported = false;
  $: mimeTypeSupported = MediaRecorder.isTypeSupported(selectedMimetype);

  let video: HTMLVideoElement;
  let videoStream: MediaStream;
  let webcamStreamReady = false;

  async function startStream() {
    webcamStreamReady = false;
    video.srcObject = null;
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
    }

    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedInput.deviceId, width, height },
      });
    } catch (e) {
      console.log(e);
    }
    video.srcObject = videoStream;

    // await video.play();
    webcamStreamReady = true;

    updateLogs("stream started with " + selectedInput.label);
  }

  let canvas: HTMLCanvasElement;
  let canvasStream: MediaStream;
  let ctx: CanvasRenderingContext2D | null;
  let mediaRecorder: MediaRecorder;

  let recorderConfigured = false;
  let chunks: Blob[] = [];

  const onStop = () => {
    console.log("stop called");
    const blob = new Blob(chunks, { type: selectedMimetype });
    chunks = [];

    updateLogs("media ready");
    updateLogs(URL.createObjectURL(blob));
  };

  MediaRecorder.isTypeSupported("");

  async function configureStream() {
    ctx = canvas.getContext("2d");
    canvasStream = canvas.captureStream();
    mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType: selectedMimetype,
      videoKeyFrameIntervalCount: 0,
    });

    mediaRecorder.ondataavailable = ({ data }) => {
      console.log("data available", data);
      chunks.push(data);

      // let chunkNo = 0;
      // const link = document.createElement("a");
      // link.href = URL.createObjectURL(data);
      // link.download = `video_chunk_${chunkNo + 1}.webm`;

      // document.body.appendChild(link);
      // link.click();

      // document.body.removeChild(link);
      // chunkNo++;
    };

    mediaRecorder.addEventListener("stop", onStop);

    updateLogs("media recorder configured");
    recorderConfigured = true;
  }

  let isEncoding = false;
  let isCapturing = false;
  let captureComplete = false;

  let frameRate = 0;
  let capturedFrames = 1;

  async function startRecording() {
    if (captureComplete) return;
    if (!recorderConfigured) configureStream();
    if (!ctx) throw new Error("No rendering context availabe");

    if (mediaRecorder.state === "inactive") mediaRecorder.start();

    if (!isCapturing) {
      isCapturing = true;
      updateLogs("capturing video stream");
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0);

    capturedFrames++;

    if (frameRate === 0) {
      video.requestVideoFrameCallback(startRecording);
    } else {
      setTimeout(startRecording, 1000 / frameRate);
    }
  }

  async function endRecording() {
    updateLogs("beginning encoding");
    captureComplete = true;
    isCapturing = false;
    isEncoding = true;

    mediaRecorder.stop();
    isEncoding = false;
  }

  let logs: string[] = [];

  function reset() {
    logs = [];
    selectedMimetype = "Select mimeType";
    mimeTypeSupported = false;
    webcamStreamReady = false;
    recorderConfigured = false;
    chunks = [];
    isEncoding = false;
    isCapturing = false;
    captureComplete = false;
    capturedFrames = 1;
  }
</script>

<div class="grid grid-cols-5 grow">
  <div class="col-span-1 p-4 overflow-y-scroll font-mono text-sm bg-slate-200 overflow-hiden">
    <p class="font-bold">logs</p>
    {#each logs as log}
      <p class={log.includes("encoder log:") ? "encoder-log" : ""}>- {log}</p>
    {/each}
  </div>

  <main class="col-span-4 p-4 space-y-4 bg-slate-800">
    <div class="contain">
      <p class="underline text-slate-50">Input and Stream</p>

      <div class="flex items-start gap-4">
        <button disabled={inputsFetched} on:click={getInputSources}>Get input sources</button>

        <select class="self-stretch" disabled={!inputsFetched} bind:value={selectedInput}>
          <option>Select input device</option>
          {#each inputSources as source (source.deviceId)}
            <option value={source}>{source.label}</option>
          {/each}
        </select>

        <button disabled={!inputsFetched} on:click={startStream}>Start stream</button>
      </div>
    </div>

    <div class="contain">
      <p class="underline text-slate-50">Media Recorder Configuration</p>

      <select disabled={!webcamStreamReady} bind:value={selectedMimetype}>
        <option>Select mimeType</option>
        {#each mimeTypes as mimeType}
          <option value={mimeType}>{mimeType}</option>
        {/each}
      </select>

      <div class="flex items-start gap-4">
        <label class="flex flex-col gap-2">
          <span>Framerate (0 = auto, 30 max)</span>
          <input type="number" bind:value={frameRate} min="0" max="30" />
        </label>

        <div>
          Frames captured: {capturedFrames}
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button
          disabled={isCapturing || isEncoding || !mimeTypeSupported || !webcamStreamReady}
          on:click={startRecording}>Start capture</button
        >

        <button
          disabled={!isCapturing || isEncoding || !mimeTypeSupported || !webcamStreamReady}
          on:click={() => mediaRecorder.requestData()}>Get blob</button
        >

        <button disabled={isEncoding || !webcamStreamReady} on:click={endRecording}
          >Stop capture</button
        >

        <button on:click={reset}>Reset</button>
      </div>
    </div>
    <video class="max-w-full" bind:this={video} autoplay><track kind="captions" /></video>

    <canvas hidden {height} {width} bind:this={canvas}></canvas>
  </main>
</div>

<style>
  .contain {
    @apply bg-slate-500 p-4 rounded-md space-y-4;
  }

  button {
    @apply bg-slate-50 rounded-md px-2 py-1 border border-slate-200 disabled:bg-slate-500 disabled:border-slate-600;
  }

  select {
    @apply bg-slate-200 px-2 py-1;
  }
</style>
