let startButton = document.getElementById("startButton");
let stopButton = document.getElementById("downloadButton");
let clearButton = document.getElementById("clearButton");

let mediaRecorder;
let recordedChunks = [];

startButton.addEventListener("click", startRecording);
downloadButton.addEventListener("click", stopRecording);
clearButton.addEventListener("click", clearDrawing);

//clear the canvas 
function clearDrawing() {
  window.clearCanvas();
}

//start recording
function startRecording() {
//find the canvas created it
  let canvas = document.getElementById("drawingCanvas");

//capture the canvas
  let canvasStream = canvas.captureStream(30);

//create the recorder
  mediaRecorder = new MediaRecorder(canvasStream);

//empty any video data from an earlier recording
  recordedChunks = [];

//save each piece of recorded video data
  mediaRecorder.addEventListener("dataavailable", saveVideoData);

//download the video after recording stops
  mediaRecorder.addEventListener("stop", downloadVideo);

//begin recording
  mediaRecorder.start();

//change which buttons can be clicked
  startButton.disabled = true;
  stopButton.disabled = false;
}

//save the recorded video data
function saveVideoData(event) {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

//stop recording
function stopRecording() {
  mediaRecorder.stop();

  startButton.disabled = false;
  stopButton.disabled = true;
}

//create and download the video file
function downloadVideo() {
  // Combine the recorded pieces into one video
  let videoBlob = new Blob(recordedChunks, {
    type: "video/webm"
  });

//create a url for the video
  let videoUrl = URL.createObjectURL(videoBlob);

//create a temporary download link
  let link = document.createElement("a");
  link.href = videoUrl;
  link.download = "kaleidoscope-drawing.webm";

//add the link, click and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

//remove the url
  URL.revokeObjectURL(videoUrl);
}