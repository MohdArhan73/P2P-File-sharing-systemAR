import firebase from "firebase/app";
import "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

// DOM Elements
const myPeerIdEl = document.getElementById('my-peer-id');
const copyIdBtn = document.getElementById('copy-id-btn');
const receiverIdInput = document.getElementById('receiver-id-input');
const connectBtn = document.getElementById('connect-btn');
const fileInput = document.getElementById('file-input');
const sendFileBtn = document.getElementById('send-file-btn');
const connectionStatusEl = document.getElementById('connection-status');
const receivedFilesListEl = document.getElementById('received-files-list');
const receiveStatusEl = document.getElementById('receive-status');

// Security check
if (!window.isSecureContext) {
  alert("This app requires HTTPS. Please reload under a secure context.");
}

let peerConnection = null;
let dataChannel = null;
let roomId = null;
let isInitiator = false;
let isReceiver = false;

// Generate a random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 15);
}

// Initialize WebRTC connection
function initializePeerConnection() {
  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:YOUR_TURN_SERVER:3478",
        username: "TURN_USERNAME",
        credential: "TURN_CREDENTIAL"
      }
    ]
  };

  peerConnection = new RTCPeerConnection(configuration);
  
  // Enhanced debug logging
  peerConnection.onicecandidate = (event) => {
    console.log("ICE candidate:", event.candidate);
    if (event.candidate) {
      firestore.collection('rooms').doc(roomId).collection('candidates').add({
        candidate: event.candidate,
        from: isInitiator ? 'initiator' : 'receiver'
      });
      console.log("Firebase write: ICE candidate");
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log("ICE state:", peerConnection.iceConnectionState);
    connectionStatusEl.textContent = `ICE State: ${peerConnection.iceConnectionState}`;
  };

  // Create data channel
  if (isInitiator) {
    dataChannel = peerConnection.createDataChannel('fileTransfer');
    setupDataChannel(dataChannel);
  }

  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel(dataChannel);
  };

  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log("Connection state:", peerConnection.connectionState);
    connectionStatusEl.textContent = `Connection State: ${peerConnection.connectionState}`;
  };
}

function setupDataChannel(channel) {
  let receivedBuffers = [];
  let expectedFileSize = 0;
  let currentFileName = '';
  let transferStartTime = null;
  let lastProgressUpdate = 0;

  channel.onopen = () => {
    console.log("Data channel opened");
    connectionStatusEl.textContent = "Data channel opened";
    fileInput.disabled = false;
    sendFileBtn.disabled = false;
  };

  channel.onclose = () => {
    console.log("Data channel closed");
    connectionStatusEl.textContent = "Data channel closed";
    disableSendControls();
    // Clear any incomplete transfers
    receivedBuffers = [];
    expectedFileSize = 0;
    currentFileName = '';
  };

  channel.onerror = (error) => {
    console.error("Data channel error:", error);
    connectionStatusEl.textContent = "Data channel error occurred";
    alert("An error occurred during file transfer. Please try again.");
    disableSendControls();
  };

  channel.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      try {
        receivedBuffers.push(event.data);
        const totalReceived = receivedBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
        
        // Update progress every 500ms
        const now = Date.now();
        if (now - lastProgressUpdate > 500) {
          const progress = (totalReceived / expectedFileSize) * 100;
          receiveStatusEl.textContent = `Receiving ${currentFileName}: ${progress.toFixed(1)}%`;
          lastProgressUpdate = now;
        }
        
        if (totalReceived === expectedFileSize) {
          const blob = new Blob(receivedBuffers);
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = currentFileName;
          a.textContent = `Download ${currentFileName}`;
          
          if (receivedFilesListEl.querySelector('p')) {
            receivedFilesListEl.innerHTML = '';
          }
          receivedFilesListEl.appendChild(a);
          
          const transferTime = (Date.now() - transferStartTime) / 1000;
          const fileSizeMB = expectedFileSize / (1024 * 1024);
          const speedMBps = fileSizeMB / transferTime;
          
          receiveStatusEl.textContent = `File ${currentFileName} received! (${speedMBps.toFixed(2)} MB/s)`;
          receivedBuffers = [];
        }
      } catch (error) {
        console.error("Error processing received data:", error);
        receiveStatusEl.textContent = "Error processing received file";
        alert("Error processing received file. Please try again.");
        receivedBuffers = [];
      }
    } else {
      try {
        // Handle metadata message
        const metadata = JSON.parse(event.data);
        if (metadata.type === 'file-metadata') {
          expectedFileSize = metadata.size;
          currentFileName = metadata.name;
          transferStartTime = Date.now();
          receiveStatusEl.textContent = `Receiving file: ${currentFileName} (${(expectedFileSize / 1024 / 1024).toFixed(2)} MB)`;
        }
      } catch (error) {
        console.error("Error processing metadata:", error);
        receiveStatusEl.textContent = "Error processing file metadata";
      }
    }
  };
}

async function createOffer() {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    firestore.collection('rooms').doc(roomId).set({
      offer: offer
    });
    console.log("Firebase write: Offer");
  } catch (error) {
    console.error("Error creating offer:", error);
  }
}

async function createAnswer() {
  try {
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    firestore.collection('rooms').doc(roomId).update({
      answer: answer
    });
    console.log("Firebase write: Answer");
  } catch (error) {
    console.error("Error creating answer:", error);
  }
}

async function handleIncomingConnection() {
  isReceiver = true;
  initializePeerConnection();

  // Listen for offer
  firestore.collection('rooms').doc(roomId)
    .onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (data?.offer && !peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
          .then(() => createAnswer())
          .catch(error => console.error("Error setting remote description:", error));
        console.log("Firebase update: Offer received");
      }
    });

  // Listen for ICE candidates
  firestore.collection('rooms').doc(roomId).collection('candidates')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = change.doc.data().candidate;
          if (candidate && change.doc.data().from === 'initiator') {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Firebase update: ICE candidate received");
          }
        }
      });
    });
}

function connectToPeer() {
  const receiverId = receiverIdInput.value.trim();
  if (!receiverId) {
    alert('Please enter a receiver ID.');
    return;
  }

  if (receiverId === roomId) {
    alert("You cannot connect to yourself.");
    return;
  }

  roomId = receiverId;
  isInitiator = true;
  isReceiver = false;
  
  initializePeerConnection();
  createOffer();
  
  // Listen for answer
  firestore.collection('rooms').doc(roomId)
    .onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (data?.answer && !peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
          .catch(error => console.error("Error setting remote description:", error));
        console.log("Firebase update: Answer received");
      }
    });

  // Listen for ICE candidates
  firestore.collection('rooms').doc(roomId).collection('candidates')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = change.doc.data().candidate;
          if (candidate && change.doc.data().from === 'receiver') {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Firebase update: ICE candidate received");
          }
        }
      });
    });
}

function sendFile() {
  if (!dataChannel || dataChannel.readyState !== 'open') {
    alert('Data channel not ready. Please wait for connection.');
    return;
  }

  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a file to send.');
    return;
  }

  // Check file size (limit to 2GB)
  if (file.size > 2 * 1024 * 1024 * 1024) {
    alert('File size exceeds 2GB limit.');
    return;
  }

  try {
    // Send file metadata first
    const metadata = {
      type: 'file-metadata',
      name: file.name,
      size: file.size
    };
    dataChannel.send(JSON.stringify(metadata));

    // Send file in chunks
    const chunkSize = 16 * 1024; // 16 KB per chunk
    let offset = 0;
    let lastProgressUpdate = 0;
    const startTime = Date.now();

    function sendNextChunk() {
      if (dataChannel.readyState !== 'open') {
        alert('Connection lost during file transfer.');
        return;
      }

      const slice = file.slice(offset, offset + chunkSize);
      slice.arrayBuffer().then(buffer => {
        try {
          dataChannel.send(buffer);
          offset += chunkSize;

          // Update progress every 500ms
          const now = Date.now();
          if (now - lastProgressUpdate > 500) {
            const progress = (offset / file.size) * 100;
            const elapsedTime = (now - startTime) / 1000;
            const speedMBps = (offset / (1024 * 1024)) / elapsedTime;
            connectionStatusEl.textContent = `Sending ${file.name}: ${progress.toFixed(1)}% (${speedMBps.toFixed(2)} MB/s)`;
            lastProgressUpdate = now;
          }

          if (offset < file.size) {
            sendNextChunk();
          } else {
            connectionStatusEl.textContent = `File ${file.name} sent!`;
            fileInput.value = '';
          }
        } catch (error) {
          console.error("Error sending chunk:", error);
          alert("Error sending file. Please try again.");
        }
      }).catch(error => {
        console.error("Error reading file chunk:", error);
        alert("Error reading file. Please try again.");
      });
    }

    sendNextChunk();
  } catch (error) {
    console.error("Error in sendFile:", error);
    alert("Error preparing file for transfer. Please try again.");
  }
}

function disableSendControls() {
  fileInput.disabled = true;
  sendFileBtn.disabled = true;
}

// Event Listeners
copyIdBtn.addEventListener('click', () => {
  if (roomId) {
    navigator.clipboard.writeText(roomId)
      .then(() => alert('Room ID copied to clipboard!'))
      .catch(err => {
        console.error('Failed to copy ID: ', err);
        alert('Failed to copy ID. Please copy it manually.');
      });
  } else {
    alert('Room ID not available yet.');
  }
});

connectBtn.addEventListener('click', connectToPeer);
sendFileBtn.addEventListener('click', sendFile);

// Listen for room ID input changes
receiverIdInput.addEventListener('input', () => {
  const inputId = receiverIdInput.value.trim();
  if (inputId && inputId !== roomId) {
    connectBtn.disabled = false;
  } else {
    connectBtn.disabled = true;
  }
});

// Initialize room ID
roomId = generateRoomId();
myPeerIdEl.textContent = roomId;

// Check if we're joining an existing room
const urlParams = new URLSearchParams(window.location.search);
const joinRoomId = urlParams.get('room');
if (joinRoomId) {
  roomId = joinRoomId;
  receiverIdInput.value = joinRoomId;
  handleIncomingConnection();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (peerConnection) {
    peerConnection.close();
  }
  if (roomId) {
    // Only delete the room if we're the initiator
    if (isInitiator) {
      firestore.collection('rooms').doc(roomId).delete();
    }
  }
});
