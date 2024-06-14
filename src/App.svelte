<script lang="ts">
  import { onMount } from "svelte";

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
      return device.kind === "videoinput" && !device.label.includes("OBS");
    });
    inputsFetched = true;

    updateLogs("input sources fetched");
  }

  let video: HTMLVideoElement;
  let videoStream: MediaStream;
  let webcamStreamReady = false;

  async function startStream() {
    webcamStreamReady = false;
    video.srcObject = null;
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
    }

    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: selectedInput.deviceId, width, height },
    });
    video.srcObject = videoStream;

    await video.play();
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
    // const blob = new Blob(chunks, { type: "video/webm; codecs=vp09.00.21.08" });
    const blob = new Blob(chunks, { type: "video/webm;codecs=vp9" });
    chunks = [];
    console.log("media ready");
    console.log(URL.createObjectURL(blob));
  };

  async function configureStream() {
    ctx = canvas.getContext("2d");
    canvasStream = canvas.captureStream();
    // mediaRecorder = new MediaRecorder(canvasStream, { mimeType: "video/webm" });
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType: "video/webm;codecs=vp9" });

    mediaRecorder.addEventListener("stop", onStop);

    updateLogs("media recorder configured");
    recorderConfigured = true;
  }

  let isEncoding = false;
  let isCapturing = false;
  let captureComplete = false;

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

    console.log("captured", capturedFrames, "frames");
    capturedFrames++;

    video.requestVideoFrameCallback(startRecording);
  }

  async function endRecording() {
    updateLogs("beginning encoding");
    captureComplete = true;
    isCapturing = false;
    isEncoding = true;

    mediaRecorder.ondataavailable = ({ data }) => {
      console.log("data available", data);
      chunks.push(data);
    };

    mediaRecorder.stop();
    isEncoding = false;
  }

  let logs: string[] = [];
</script>

<div class="container">
  <aside>
    {#each logs as log}
      <p class={log.includes("encoder log:") ? "encoder-log" : ""}>{log}</p>
    {/each}
  </aside>

  <main>
    <div>
      {#if !inputsFetched}
        <button on:click={getInputSources}>Get input sources</button>
      {/if}

      {#if inputsFetched}
        <select bind:value={selectedInput}>
          {#each inputSources as source (source.deviceId)}
            <option value={source}>{source.label}</option>
          {/each}
        </select>

        <button on:click={startStream}>Start stream</button>
      {/if}

      {#if webcamStreamReady}
        <button disabled={isCapturing || isEncoding} on:click={startRecording}>Start capture</button
        >
        <button disabled={isEncoding} on:click={endRecording}>stop capture</button>
      {/if}
    </div>

    <video height={height / 4} width={width / 4} bind:this={video}><track kind="captions" /></video>
    <canvas {height} {width} bind:this={canvas}></canvas>
  </main>
</div>

<style>
  .container {
    display: flex;
    flex-direction: row;
  }

  aside {
    background-color: white;
    color: black;
    padding: 1rem;
    width: 200px;
    font-size: small;
    overflow: hidden;
    overflow-y: scroll;
    overflow-x: hidden;
    height: 100vh;
  }

  main {
    position: absolute;
    width: calc(100vw - 200px);
    left: 200px;
  }

  .encoder-log {
    color: blue;
  }
</style>
