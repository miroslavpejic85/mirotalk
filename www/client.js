/*
 ██████ ██      ██ ███████ ███    ██ ████████ 
██      ██      ██ ██      ████   ██    ██    
██      ██      ██ █████   ██ ██  ██    ██    
██      ██      ██ ██      ██  ██ ██    ██    
 ██████ ███████ ██ ███████ ██   ████    ██    
*/

// =====================================================
// config var
// =====================================================
const loaderGif = "/images/loader.gif";
var signaling_server_port = 80;
var signaling_server = getserverURL();
var room_id = getRoomId();
var peerInfo = getPeerInfo();
var peerConnection = null;
var use_audio = true;
var use_video = true;
var camera = "user";
var is_screen_streaming = false;
var signalingSocket = null; // socket.io connection to our webserver
var localMediaStream = null; // my microphone / webcam
var remoteMediaStream = null; // friends microphone / webcam
var peers = {}; // keep track of our peer connections, indexed by peer_id == socket.io id
var peerMediaElements = {}; // keep track of our <video> tags, indexed by peer_id
var ice_servers = [{ urls: "stun:stun.l.google.com:19302" }]; // backup iceServers

// =====================================================
// get info using DetecRTC
// =====================================================
function getPeerInfo() {
  return {
    detectRTCversion: DetectRTC.version,
    isWebRTCSupported: DetectRTC.isWebRTCSupported,
    isMobileDevice: DetectRTC.isMobileDevice,
    osName: DetectRTC.osName,
    osVersion: DetectRTC.osVersion,
    browser_name: DetectRTC.browser.name,
    browser_version: DetectRTC.browser.version,
  }; // https://github.com/muaz-khan/DetectRTC
}

// =====================================================
// signaling Server URL
// =====================================================
function getserverURL() {
  return (
    "http" +
    (location.hostname == "localhost" ? "" : "s") +
    "://" +
    location.hostname
  );
}

// =====================================================
// generate random room id
// =====================================================
function getRoomId() {
  let roomId = location.pathname.substring(1);
  // if not specified room name, create one random
  if (roomId == "") {
    roomId = Math.random().toString(36).substr(2, 10);
    const newurl = signaling_server + "/" + roomId;
    window.history.pushState({ url: newurl }, roomId, newurl);
  }
  return roomId;
}

// =====================================================
// get started
// =====================================================
function initPeer() {
  /* https://github.com/muaz-khan/DetectRTC
   * check if peer is done for WebRTC */
  if (DetectRTC.isWebRTCSupported === false) {
    console.error("isWebRTCSupported: false");
    userLog("info", "This browser seems not supported WebRTC!");
    return;
  }

  // peer ready for WebRTC! :)
  console.log("Connecting to signaling server");
  signalingSocket = io(signaling_server);

  signalingSocket.on("connect", function () {
    console.log("Connected to signaling server");
    setupLocalMedia(function () {
      /* once the user has given us access to their
       * microphone/camcorder, join the channel
       * and start peering up */
      joinToChannel(room_id, peerInfo);
    });
  });

  signalingSocket.on("disconnect", function () {
    console.log("Disconnected from signaling server");
    /* Tear down all of our peer connections and remove all the
     * media divs when we disconnect */
    for (peer_id in peerMediaElements) {
      document.body.removeChild(peerMediaElements[peer_id].parentNode);
      resizeVideos();
    }
    for (peer_id in peers) {
      peers[peer_id].close();
    }

    peers = {};
    peerMediaElements = {};
  });

  // join to chennel and send some peer info
  function joinToChannel(channel, peerInfo) {
    console.log("join to channel", channel);
    signalingSocket.emit("join", {
      channel: channel,
      peerInfo: peerInfo,
    });
  }

  /*
   * When we join a group, our signaling server will send out 'addPeer' events to each pair
   * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
   * in the channel you will connect directly to the other 5, so there will be a total of 15
   * connections in the network).
   */
  signalingSocket.on("addPeer", function (config) {
    // console.log('-------------------------------')
    // console.log('addPeer', JSON.stringify(config))
    // console.log('-------------------------------')

    var peer_id = config.peer_id;
    if (peer_id in peers) {
      /* This could happen if the user joins multiple channels where the other peer is also in. */
      console.log("Already connected to peer", peer_id);
      return;
    }

    if (config.iceServers) ice_servers = config.iceServers;
    console.log("iceServers", ice_servers[0]);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    peerConnection = new RTCPeerConnection(
      { iceServers: ice_servers },
      {
        optional: [
          { DtlsSrtpKeyAgreement: true }, // is required for Chrome and Firefox to interoperate.
          { RtpDataChannels: DetectRTC.isRtpDataChannelsSupported }, // is required if we want to make use of the DataChannels API on Firefox.
        ],
      }
    );
    // collect peer connections
    peers[peer_id] = peerConnection;

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
    peers[peer_id].onicecandidate = function (event) {
      if (event.candidate) {
        signalingSocket.emit("relayICE", {
          peer_id: peer_id,
          ice_candidate: {
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate,
            address: event.candidate.address,
          },
        });
      }
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onaddstream
    // WebRTC: onaddstream is deprecated! Use peerConnection.ontrack instead.
    peers[peer_id].onaddstream = function (event) {
      console.log("onaddstream", event);
      remoteMediaStream = event.stream;
      const videoWrap = document.createElement("div");
      videoWrap.className = "video";
      const remoteMedia = document.createElement("video");
      videoWrap.appendChild(remoteMedia);
      remoteMedia.setAttribute("playsinline", true);
      remoteMedia.mediaGroup = "remotevideo";
      remoteMedia.poster = loaderGif;
      remoteMedia.autoplay = true;
      remoteMedia.controls = false;
      peerMediaElements[peer_id] = remoteMedia;
      document.body.appendChild(videoWrap);

      // attachMediaStream is a part of the adapter.js library
      attachMediaStream(remoteMedia, remoteMediaStream);
      remoteMedia.poster = null;
      resizeVideos();
    };
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addStream
    peers[peer_id].addStream(localMediaStream); // Add our local stream

    /*
     * Only one side of the peer connection should create the
     * offer, the signaling server picks one to be the offerer.
     * The other user will get a 'sessionDescription' event and will
     * create an offer, then send back an answer 'sessionDescription' to us
     */
    if (config.should_create_offer) {
      console.log("Creating RTC offer to", peer_id);
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
      peers[peer_id]
        .createOffer()
        .then(function (local_description) {
          console.log("Local offer description is", local_description);
          // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
          peers[peer_id]
            .setLocalDescription(local_description)
            .then(function () {
              signalingSocket.emit("relaySDP", {
                peer_id: peer_id,
                session_description: local_description,
              });
              console.log("Offer setLocalDescription done!");
            })
            .catch((e) => {
              console.error("[Error] offer setLocalDescription", e);
              userLog("error", "Offer setLocalDescription failed!");
            });
        })
        .catch((e) => {
          console.error("[Error] sending offer", e);
        });
    } // end if offer true
  }); // end addPeer

  /**
   * Peers exchange session descriptions which contains information
   * about their audio / video settings and that sort of stuff. First
   * the 'offerer' sends a description to the 'answerer' (with type
   * "offer"), then the answerer sends one back (with type "answer").
   */
  signalingSocket.on("sessionDescription", function (config) {
    console.log("Remote Session-description", config);

    var peer_id = config.peer_id;
    var peer = peers[peer_id];
    var remote_description = config.session_description;

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription
    var description = new RTCSessionDescription(remote_description);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription
    peer
      .setRemoteDescription(description)
      .then(function () {
        console.log("setRemoteDescription done!");
        if (remote_description.type == "offer") {
          console.log("Creating answer");
          // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
          peer
            .createAnswer()
            .then(function (local_description) {
              console.log("Answer description is: ", local_description);
              // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
              peer
                .setLocalDescription(local_description)
                .then(function () {
                  signalingSocket.emit("relaySDP", {
                    peer_id: peer_id,
                    session_description: local_description,
                  });
                  console.log("Answer setLocalDescription done!");
                })
                .catch((e) => {
                  console.error("[Error] answer setLocalDescription", e);
                  userLog("error", "Answer setLocalDescription failed!");
                });
            })
            .catch((e) => {
              console.error("[Error] creating answer", e);
            });
        } // end if type [offer]
      })
      .catch((e) => {
        console.error("[Error] setRemoteDescription", e);
      });
  });

  /**
   * The offerer will send a number of ICE Candidate blobs to the answerer so they
   * can begin trying to find the best path to one another on the net.
   */
  signalingSocket.on("iceCandidate", function (config) {
    var peer = peers[config.peer_id];
    var ice_candidate = config.ice_candidate;
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate
    peer.addIceCandidate(new RTCIceCandidate(ice_candidate));
  });

  /**
   * When a user leaves a channel (or is disconnected from the
   * signaling server) everyone will recieve a 'removePeer' message
   * telling them to trash the media channels they have open for those
   * that peer. If it was this client that left a channel, they'll also
   * receive the removePeers. If this client was disconnected, they
   * wont receive removePeers, but rather the
   * signaling_socket.on('disconnect') code will kick in and tear down
   * all the peer sessions.
   */
  signalingSocket.on("removePeer", function (config) {
    console.log("Signaling server said to remove peer:", config);
    var peer_id = config.peer_id;
    if (peer_id in peerMediaElements) {
      document.body.removeChild(peerMediaElements[peer_id].parentNode);
      resizeVideos();
    }
    if (peer_id in peers) {
      peers[peer_id].close();
    }

    delete peers[peer_id];
    delete peerMediaElements[config.peer_id];
  });

  // show messages
  signalingSocket.on("onMessage", function (config) {
    showMessage(config.msg);
  });
} // end [initPeer]

// =====================================================
// Local media stuff
// =====================================================
function setupLocalMedia(callback, errorback) {
  /* ie, if we've already been initialized do nothing */
  if (localMediaStream != null) {
    if (callback) callback();
    return;
  }

  /* Ask user for permission to use the computers microphone and/or camera,
   * attach it to an <audio> or <video> tag if they give us access. */
  console.log("Requesting access to local audio / video inputs");

  attachMediaStream = function (element, stream) {
    console.log("DEPRECATED, attachMediaStream will soon be removed.");
    element.srcObject = stream;
  };

  const constraints = {
    video: use_video,
    audio: use_audio,
  };

  navigator.mediaDevices
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    .getUserMedia(constraints)
    .then((stream) => {
      console.log("Access granted to audio/video");
      document.body.style.backgroundImage = "none";

      localMediaStream = stream;

      manageButtons();

      // =====================================================
      // setup localMedia
      // =====================================================
      const videoWrap = document.createElement("div");
      videoWrap.className = "video";
      videoWrap.setAttribute("id", "myVideoWrap");
      const localMedia = document.createElement("video");
      videoWrap.appendChild(localMedia);
      localMedia.setAttribute("id", "myVideo");
      localMedia.setAttribute("playsinline", true);
      localMedia.className = "mirror";
      localMedia.poster = loaderGif;
      localMedia.autoplay = true;
      localMedia.muted = true;
      localMedia.volume = 0;
      localMedia.controls = false;
      document.body.appendChild(videoWrap);

      console.log("local-video-audio", {
        video: localMediaStream.getVideoTracks()[0].label,
        audio: localMediaStream.getAudioTracks()[0].label,
      });

      // attachMediaStream is a part of the adapter.js library
      attachMediaStream(localMedia, localMediaStream);
      localMedia.poster = null;
      resizeVideos();

      if (callback) callback();
    })
    .catch((e) => {
      /* user denied access to a/v */
      console.error("Access denied for audio/video", e);
      userLog(
        "error",
        "This app will not work without camera/microphone access."
      );
      if (errorback) errorback();
    });
} // end [setup_local_stream]

// =====================================================
// WebRTC buttons
// =====================================================
function manageButtons() {
  copyRoomBtn();
  audioBtn();
  videoBtn();
  swapCameraBtn();
  screenShareBtn();
  sendMsgBtn();
  aboutBtn();
  leaveRoomBtn();
  buttonsOpacity();
}

// =====================================================
// copy Room URL button click event
// =====================================================
function copyRoomBtn() {
  document.getElementById("copyRoomBtn").addEventListener("click", (e) => {
    copyRoomURL();
  });
}

// =====================================================
// audio mute-unmute button click event
// =====================================================
function audioBtn() {
  document.getElementById("audioBtn").addEventListener("click", (e) => {
    localMediaStream.getAudioTracks()[0].enabled = !localMediaStream.getAudioTracks()[0]
      .enabled;
    e.target.className =
      "fas fa-microphone" +
      (localMediaStream.getAudioTracks()[0].enabled ? "" : "-slash");
  });
}

// =====================================================
// video hide-show button click event
// =====================================================
function videoBtn() {
  document.getElementById("videoBtn").addEventListener("click", (e) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getVideoTracks
    localMediaStream.getVideoTracks()[0].enabled = !localMediaStream.getVideoTracks()[0]
      .enabled;
    e.target.className =
      "fas fa-video" +
      (localMediaStream.getVideoTracks()[0].enabled ? "" : "-slash");
  });
}

// =====================================================
// check if can swap or not cam, if yes show the button else hide it
// =====================================================
function swapCameraBtn() {
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    const videoInput = devices.filter((device) => device.kind === "videoinput");
    if (videoInput.length > 1) {
      // swap camera front-rear button click event
      document
        .getElementById("swapCameraBtn")
        .addEventListener("click", (e) => {
          swapCamera();
        });
    } else {
      document.getElementById("swapCameraBtn").style.display = "none";
    }
  });
}

// =====================================================
// check if can share a screen, if yes show button else hide it
// =====================================================
function screenShareBtn() {
  if (navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia) {
    // share-screen on-off button click event
    document.getElementById("screenShareBtn").addEventListener("click", (e) => {
      toggleScreenSharing();
    });
  } else {
    document.getElementById("screenShareBtn").style.display = "none";
  }
}

// =====================================================
// send message button click event
// =====================================================
function sendMsgBtn() {
  document.getElementById("sendMsgBtn").addEventListener("click", (e) => {
    sendMessage();
  });
}

// =====================================================
// about button click event
// =====================================================
function aboutBtn() {
  document.getElementById("aboutBtn").addEventListener("click", (e) => {
    about();
  });
}

// =====================================================
// end call button click event
// =====================================================
function leaveRoomBtn() {
  document.getElementById("leaveRoomBtn").addEventListener("click", (e) => {
    leaveRoom();
  });
}

// =====================================================
// set button opacity 1 means no opacity, you can change if like (0.5) ..
// =====================================================
function buttonsOpacity() {
  document.getElementById("buttons").style.opacity = "1";
}

// =====================================================
// resize Videos frames
// =====================================================
function resizeVideos() {
  const numToString = ["", "one", "two", "three", "four", "five", "six"];
  const videos = document.querySelectorAll(".video");
  document.querySelectorAll(".video").forEach((v) => {
    v.className = "video " + numToString[videos.length];
  });
}

// =====================================================
// send message to peers
// =====================================================
function sendMessage() {
  if (!peerConnection) {
    userLog("info", "Can't Send msg, no peer connection detected");
    return;
  }
  Swal.fire({
    background: "black",
    position: "center",
    title: "Send Message",
    input: "text",
    showDenyButton: true,
    confirmButtonText: `Send`,
    denyButtonText: `Cancel`,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      let msg = result.value;
      if (msg) {
        // Send message over signaling server
        signalingSocket.emit("msg", {
          peers: peers,
          msg: msg,
        });
      }
    }
  });
}

// =====================================================
// Called when a message is recieved over the dataChannel
// =====================================================
function showMessage(msg) {
  Swal.fire({
    background: "black",
    position: "center",
    icon: "success",
    title: "New message",
    text: msg,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  });
}

// =====================================================
// active - disactive screen sharing
// =====================================================
function toggleScreenSharing() {
  if (!peerConnection) {
    userLog("info", "Can't Toggle screen sharing, no peer connection detected");
    return;
  }

  const constraints = {
    video: true,
  };

  let screenMediaPromise;

  if (!is_screen_streaming) {
    if (navigator.getDisplayMedia) {
      // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
      screenMediaPromise = navigator.getDisplayMedia(constraints);
    } else if (navigator.mediaDevices.getDisplayMedia) {
      screenMediaPromise = navigator.mediaDevices.getDisplayMedia(constraints);
    } else {
      // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
      screenMediaPromise = navigator.mediaDevices.getUserMedia({
        video: {
          mediaSource: "screen",
        },
      });
    }
  } else {
    screenMediaPromise = navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById("videoBtn").className = "fas fa-video"; // make sure to enable video
  }
  screenMediaPromise
    .then((screenStream) => {
      is_screen_streaming = !is_screen_streaming;

      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
      var sender = peerConnection
        .getSenders()
        .find((s) => (s.track ? s.track.kind === "video" : false));
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
      sender.replaceTrack(screenStream.getVideoTracks()[0]);
      screenStream.getVideoTracks()[0].enabled = true;

      // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
      const newStream = new MediaStream([
        screenStream.getVideoTracks()[0],
        localMediaStream.getAudioTracks()[0],
      ]);
      localMediaStream = newStream;

      // attachMediaStream is a part of the adapter.js library
      attachMediaStream(document.getElementById("myVideo"), localMediaStream); // newstream

      document.getElementById("myVideo").classList.toggle("mirror");
      document.getElementById("screenShareBtn").classList.toggle("active");
      document.getElementById("screenShareBtn").className = is_screen_streaming
        ? "fas fa-stop-circle"
        : "fas fa-desktop";

      screenStream.getVideoTracks()[0].onended = function () {
        if (is_screen_streaming) toggleScreenSharing();
      };
    })
    .catch((e) => {
      console.error("[Error] Unable to share the screen", e);
      userLog("error", "Unable to share the screen");
    });
}

// =====================================================
// swapCamer front(user) - rear(environment)
// =====================================================
function swapCamera() {
  if (!peerConnection) {
    userLog("info", "Can't Swap the Camera, no peer connection detected");
    return;
  }

  camera = camera == "user" ? "environment" : "user";
  if (camera == "user") use_video = true;
  else use_video = { facingMode: { exact: camera } };

  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  navigator.mediaDevices
    .getUserMedia({ video: use_video })
    .then((camStream) => {
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
      var sender = peerConnection
        .getSenders()
        .find((s) => (s.track ? s.track.kind === "video" : false));
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
      sender.replaceTrack(camStream.getVideoTracks()[0]);
      camStream.getVideoTracks()[0].enabled = true;

      // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
      const newStream = new MediaStream([
        camStream.getVideoTracks()[0],
        localMediaStream.getAudioTracks()[0],
      ]);
      localMediaStream = newStream;
      // attachMediaStream is a part of the adapter.js library
      attachMediaStream(document.getElementById("myVideo"), localMediaStream);

      document.getElementById("myVideo").classList.toggle("mirror");
    })
    .catch((e) => {
      console.log("[Error] to swaping camera", e);
      userLog("error", "Error to swaping the camera");
    });
}

// =====================================================
// copy RoomID url to clipboard and share it
// =====================================================
function copyRoomURL() {
  var tmpInput = document.createElement("input");
  ROOM_URL = window.location.href;
  document.body.appendChild(tmpInput);
  tmpInput.value = ROOM_URL;
  tmpInput.select();
  tmpInput.setSelectionRange(0, 99999); /* For mobile devices */
  document.execCommand("copy");
  // https://sweetalert2.github.io
  console.log("Copied to clipboard RoomID ", ROOM_URL);
  Swal.fire({
    background: "black",
    position: "center",
    icon: "success",
    title: "RoomURL copied to clipboard",
    text: ROOM_URL,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  });
  document.body.removeChild(tmpInput);
}

// =====================================================
// about info
// =====================================================
function about() {
  Swal.fire({
    background: "black",
    position: "center",
    title: "Made with ❤️",
    text: "https://github.com/miroslavpejic85/mirotalk",
    imageUrl: loaderGif,
    imageWidth: 320,
    imageHeight: 240,
    imageAlt: "Custom image",
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  });
}

// =====================================================
// Leave the Room and create a new one
// =====================================================
function leaveRoom() {
  // https://sweetalert2.github.io
  Swal.fire({
    background: "black",
    position: "center",
    title: "Leave this room?",
    showDenyButton: true,
    confirmButtonText: `Yes`,
    denyButtonText: `No`,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  }).then((result) => {
    /* Read more about isConfirmed, isDenied below */
    if (result.isConfirmed) {
      window.location.href = "/";
    }
  });
}

// =====================================================
// Basic user logging: https://sweetalert2.github.io
// =====================================================
function userLog(type, message) {
  switch (type) {
    case "error":
      Swal.fire({
        background: "black",
        position: "center",
        icon: "error",
        title: "Oops...",
        text: message,
        showClass: {
          popup: "animate__animated animate__fadeInDown",
        },
        hideClass: {
          popup: "animate__animated animate__fadeOutUp",
        },
      });
      break;
    case "info":
      Swal.fire({
        background: "black",
        position: "center",
        icon: "info",
        title: "Info",
        text: message,
        showClass: {
          popup: "animate__animated animate__fadeInDown",
        },
        hideClass: {
          popup: "animate__animated animate__fadeOutUp",
        },
      });
      break;
    // ......
    default:
      alert(message);
  }
}
