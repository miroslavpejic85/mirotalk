/*
 ██████ ██      ██ ███████ ███    ██ ████████ 
██      ██      ██ ██      ████   ██    ██    
██      ██      ██ █████   ██ ██  ██    ██    
██      ██      ██ ██      ██  ██ ██    ██    
 ██████ ███████ ██ ███████ ██   ████    ██    
*/

"use strict"; // https://www.w3schools.com/js/js_strict.asp

// =====================================================
// Const and var
// =====================================================
const loaderGif = "/images/loader.gif";
const myChatAvatar = "/images/programmer.svg";
const friendChatAvatar = "/images/friend.svg";
const notifyBySound = true; // turn on-off sound notifications
const isWebRTCSupported = DetectRTC.isWebRTCSupported;
const isMobileDevice = DetectRTC.isMobileDevice;

var startTime;
var elapsedTime;
var mirotalkTheme = "neon"; // neon - dark - ghost ...
var swalBackground = "transparent"; // black - #16171b ...
var signalingServerPort = 80;
var signalingServer = getServerUrl();
var roomId = getRoomId();
var peerInfo = getPeerInfo();
var peerConnection = null;
var myChatName = null;
var useAudio = true;
var useVideo = true;
var camera = "user";
var videoChange = false;
var isScreenStreaming = false;
var isChatRoomVisible = false;
var isChatEmojiVisible = false;
var isButtonsVisible = false;
var isAudioVideoDevicesVisible = false;
var signalingSocket = null; // socket.io connection to our webserver
var localMediaStream = null; // my microphone / webcam
var remoteMediaStream = null; // friends microphone / webcam
var peers = {}; // keep track of our peer connections, indexed by peer_id == socket.io id
var peerMediaElements = {}; // keep track of our <video> tags, indexed by peer_id
var iceServers = [{ urls: "stun:stun.l.google.com:19302" }]; // backup iceServers

// https://github.com/wooorm/gemoji/blob/main/support.md
var map = {
  "<3": "\u2764\uFE0F",
  "</3": "\uD83D\uDC94",
  ":D": "\uD83D\uDE00",
  ":)": "\uD83D\uDE03",
  ";)": "\uD83D\uDE09",
  ":(": "\uD83D\uDE12",
  ":p": "\uD83D\uDE1B",
  ";p": "\uD83D\uDE1C",
  ":'(": "\uD83D\uDE22",
  ":+1:": "\uD83D\uDC4D",
}; //...

var countTime = null;
// left buttons
var leftButtons = null;
var copyRoomBtn = null;
var audioBtn = null;
var videoBtn = null;
var swapCameraBtn = null;
var screenShareBtn = null;
var fullScreenBtn = null;
var sendMsgBtn = null;
var chatRoomBtn = null;
var themeBtn = null;
var myDevicesBtn = null;
var aboutBtn = null;
var leaveRoomBtn = null;
// chat room elements
var msgerDraggable = null;
var msgerHeader = null;
var msgerButtons = null;
var msgerTheme = null;
var msgerClean = null;
var msgerEmojiBtn = null;
var msgerClose = null;
var msgerChat = null;
var msgerInput = null;
var msgerSendBtn = null;
// chat room emoji picker
var msgerEmojiPicker = null;
var msgerEmojiHeader = null;
var msgerCloseEmojiBtn = null;
var emojiPicker = null;
// audio - video devices
var myDevices = null;
var myDeviceHeader = null;
var myDevicesCloseBtn = null;
var audioInputSelect = null;
var audioOutputSelect = null;
var videoSelect = null;
var selectors = null;
// my video element
var myVideo = null;

// =====================================================
// Load all Html elements by ID
// =====================================================
function getHtmlElementsById() {
  countTime = get("countTime");

  // left buttons
  copyRoomBtn = get("copyRoomBtn");
  audioBtn = get("audioBtn");
  videoBtn = get("videoBtn");
  swapCameraBtn = get("swapCameraBtn");
  screenShareBtn = get("screenShareBtn");
  fullScreenBtn = get("fullScreenBtn");
  sendMsgBtn = get("sendMsgBtn");
  chatRoomBtn = get("chatRoomBtn");
  themeBtn = get("themeBtn");
  myDevicesBtn = get("myDevicesBtn");
  aboutBtn = get("aboutBtn");
  leaveRoomBtn = get("leaveRoomBtn");

  // chat Room elements
  msgerDraggable = get("msgerDraggable");
  msgerHeader = get("msgerHeader");
  msgerButtons = get("msgerButtons");
  msgerTheme = get("msgerTheme");
  msgerClean = get("msgerClean");
  msgerEmojiBtn = get("msgerEmojiBtn");
  msgerClose = get("msgerClose");
  msgerChat = get("msgerChat");
  msgerInput = get("msgerInput");
  msgerSendBtn = get("msgerSendBtn");

  // chat room emoji picker
  msgerEmojiPicker = get("msgerEmojiPicker");
  msgerEmojiHeader = get("msgerEmojiHeader");
  msgerCloseEmojiBtn = get("msgerCloseEmojiBtn");
  emojiPicker = getS("emoji-picker");

  // audio - video devices elements
  myDevices = get("myDevices");
  myDeviceHeader = get("myDeviceHeader");
  myDevicesCloseBtn = get("myDevicesCloseBtn");
  audioInputSelect = get("audioSource");
  audioOutputSelect = get("audioOutput");
  videoSelect = get("videoSource");
}

// =====================================================
// Get peer info using DetecRTC
// =====================================================
function getPeerInfo() {
  return {
    detectRTCversion: DetectRTC.version,
    isWebRTCSupported: DetectRTC.isWebRTCSupported,
    isMobileDevice: DetectRTC.isMobileDevice,
    osName: DetectRTC.osName,
    osVersion: DetectRTC.osVersion,
    browserName: DetectRTC.browser.name,
    browserVersion: DetectRTC.browser.version,
  }; // https://github.com/muaz-khan/DetectRTC
}

// =====================================================
// Signaling server url
// =====================================================
function getServerUrl() {
  return (
    "http" +
    (location.hostname == "localhost" ? "" : "s") +
    "://" +
    location.hostname
  );
}

// =====================================================
// Generate random room id
// =====================================================
function getRoomId() {
  let roomId = location.pathname.substring(1);
  // if not specified room id, create one random
  if (roomId == "") {
    roomId = Math.random().toString(36).substr(2, 10);
    const newurl = signalingServer + "/" + roomId;
    window.history.pushState({ url: newurl }, roomId, newurl);
  }
  return roomId;
}

// =====================================================
// get started
// =====================================================
function initPeer() {
  // set mirotalk theme
  setTheme(mirotalkTheme);

  /* https://github.com/muaz-khan/DetectRTC
   * check if peer is done for WebRTC */
  if (!isWebRTCSupported) {
    console.error("isWebRTCSupported: false");
    userLog("error", "This browser seems not supported WebRTC!");
    return;
  }

  // get all Html elements
  getHtmlElementsById();

  // peer ready for WebRTC! :)
  console.log("Connecting to signaling server");
  signalingSocket = io(signalingServer);

  signalingSocket.on("connect", function () {
    console.log("Connected to signaling server");
    setupLocalMedia(function () {
      /* once the user has given us access to their
       * microphone/camcorder, join the channel
       * and start peering up */
      joinToChannel(roomId, peerInfo);
    });
  });

  signalingSocket.on("disconnect", function () {
    console.log("Disconnected from signaling server");
    /* Tear down all of our peer connections and remove all the
     * media divs when we disconnect */
    for (var peer_id in peerMediaElements) {
      document.body.removeChild(peerMediaElements[peer_id].parentNode);
      resizeVideos();
    }
    for (var peer_id in peers) {
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
      // This could happen if the user joins multiple channels where the other peer is also in.
      console.log("Already connected to peer", peer_id);
      return;
    }

    if (config.iceServers) iceServers = config.iceServers;
    console.log("iceServers", iceServers[0]);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    peerConnection = new RTCPeerConnection(
      { iceServers: iceServers },
      {
        optional: [
          { DtlsSrtpKeyAgreement: true }, // is required for Chrome and Firefox to interoperate.
        ],
      }
    );

    // collect peer connections
    peers[peer_id] = peerConnection;
    playSound("addPeer");

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
      const remoteMedia = document.createElement("video");
      videoWrap.className = "video";
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
    // peers[peer_id].addStream(localMediaStream); // Add our local stream
    localMediaStream.getTracks().forEach(function (track) {
      //console.log("track -----------> ", track.kind);
      peers[peer_id].addTrack(track, localMediaStream);
    });

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
    } // end [if offer true]
  }); // end [addPeer]

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
        } // end [if type offer]
      })
      .catch((e) => {
        console.error("[Error] setRemoteDescription", e);
      });
  }); // end [sessionDescription]

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
    playSound("removePeer");
  });

  // show messages simple - chat
  signalingSocket.on("onMessage", function (config) {
    console.log("Receive msg", { msg: config.msg });
    switch (config.type) {
      case "simple":
        playSound("newMessage");
        showMessage(config.msg);
        break;
      case "chat":
        if (!isChatRoomVisible) {
          showChatRoom();
          chatRoomBtn.className = "fas fa-comment-slash";
        }
        playSound("newMessage");
        appendMessage(config.name, friendChatAvatar, "left", config.msg);
        break;
    }
  });
} // end [initPeer]

// =====================================================
// Setup audio - video devices
// =====================================================
function setupAudioVideoDevices() {
  // audio - video select box
  selectors = [audioInputSelect, audioOutputSelect, videoSelect];
  audioOutputSelect.disabled = !("sinkId" in HTMLMediaElement.prototype);
  navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
  audioInputSelect.addEventListener("change", (e) => {
    refreshLocalMedia(false);
  });
  audioOutputSelect.addEventListener("change", (e) => {
    changeAudioDestination();
  });
  videoSelect.addEventListener("change", (e) => {
    refreshLocalMedia(true);
  });
}

// =====================================================
// Refresh Local media audio video in - out
// =====================================================
function refreshLocalMedia(change) {
  videoChange = change;

  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  const audioSource = audioInputSelect.value;
  const videoSource = videoSelect.value;
  const constraints = {
    audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
    video: { deviceId: videoSource ? { exact: videoSource } : undefined },
  };
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(gotStream)
    .then(gotDevices)
    .catch(handleError);
}

// =====================================================
// Local media stuff
// =====================================================
function setupLocalMedia(callback, errorback) {
  /* ie, if we've already been initialized do nothing */
  if (localMediaStream != null) {
    if (callback) callback();
    return;
  }

  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  /* Ask user for permission to use the computers microphone and/or camera,
   * attach it to an <audio> or <video> tag if they give us access. */
  console.log("Requesting access to local audio / video inputs");

  const constraints = {
    audio: useAudio,
    video: useVideo,
  };

  navigator.mediaDevices
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    .getUserMedia(constraints)
    .then(function (stream) {
      console.log("Access granted to audio/video");
      document.body.style.backgroundImage = "none";

      localMediaStream = stream;

      startCountTime();
      manageLeftButtons();

      // =====================================================
      // Setup localMedia
      // =====================================================
      const videoWrap = document.createElement("div");
      const localMedia = document.createElement("video");
      videoWrap.className = "video";
      videoWrap.setAttribute("id", "myVideoWrap");
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
      myVideo = get("myVideo");

      console.log("local-video-audio", {
        video: localMediaStream.getVideoTracks()[0].label,
        audio: localMediaStream.getAudioTracks()[0].label,
      });

      // attachMediaStream is a part of the adapter.js library
      attachMediaStream(localMedia, localMediaStream);
      localMedia.poster = null;
      resizeVideos();

      // here i have access to audio - video can do it :P
      setupAudioVideoDevices();

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
// get Devices and show to select box
// =====================================================
function gotDevices(deviceInfos) {
  // https://github.com/webrtc/samples/tree/gh-pages/src/content/devices/input-output
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map((select) => select.value);
  selectors.forEach((select) => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  // check devices
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    // console.log("device-info ------> ", deviceInfo);
    const option = document.createElement("option");
    option.value = deviceInfo.deviceId;

    if (deviceInfo.kind === "audioinput") {
      // audio Input
      option.text =
        deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === "audiooutput") {
      // audio Output
      option.text =
        deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
      audioOutputSelect.appendChild(option);
    } else if (deviceInfo.kind === "videoinput") {
      // video Input
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } else {
      // something else
      console.log("Some other kind of source/device: ", deviceInfo);
    }
  } // end for devices

  selectors.forEach((select, selectorIndex) => {
    if (
      Array.prototype.slice
        .call(select.childNodes)
        .some((n) => n.value === values[selectorIndex])
    ) {
      select.value = values[selectorIndex];
    }
  });
}

// =====================================================
// Attach audio output device to video element using device/sink ID.
// =====================================================
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== "undefined") {
    element
      .setSinkId(sinkId)
      .then(() => {
        console.log(`Success, audio output device attached: ${sinkId}`);
      })
      .catch((error) => {
        let errorMessage = error;
        if (error.name === "SecurityError") {
          errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
        }
        console.error(errorMessage);
        // Jump back to first output device in the list as it's the default.
        audioOutputSelect.selectedIndex = 0;
      });
  } else {
    console.warn("Browser does not support output device selection.");
  }
}

// =====================================================
// Change audio output
// =====================================================
function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(myVideo, audioDestination);
}

// =====================================================
// Got Stream append to local media
// =====================================================
function gotStream(stream) {
  window.stream = stream; // make stream available to console

  // refresh my video to peers
  for (var peer_id in peers) {
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
    var sender = peers[peer_id]
      .getSenders()
      .find((s) => (s.track ? s.track.kind === "video" : false));
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
    sender.replaceTrack(stream.getVideoTracks()[0]);
  }

  stream.getVideoTracks()[0].enabled = true;
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
  const newStream = new MediaStream([
    stream.getVideoTracks()[0],
    localMediaStream.getAudioTracks()[0],
  ]);
  localMediaStream = newStream;

  // attachMediaStream is a part of the adapter.js library
  attachMediaStream(myVideo, localMediaStream);

  if (videoChange) {
    myVideo.classList.toggle("mirror");
  }

  // Refresh button list in case labels have become available
  return navigator.mediaDevices.enumerateDevices();
}

// =====================================================
// Handle error
// =====================================================
function handleError(error) {
  console.log(
    "navigator.MediaDevices.getUserMedia error: ",
    error.message,
    error.name
  );
}

// =====================================================
// Extra not used, print audio - video devices
// =====================================================
function getDevices() {
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
    return;
  }
  let myDevices = []; // List cameras and microphones.
  navigator.mediaDevices
    .enumerateDevices()
    .then(function (devices) {
      devices.forEach(function (device) {
        myDevices.push({
          deviceKind: device.kind,
          deviceName: device.label,
          deviceId: device.deviceId,
        });
      });
      console.log("Audio-Video-Devices", myDevices);
    })
    .catch(function (err) {
      console.log(err.name + ": " + err.message);
    });
}

// =====================================================
// AttachMediaStream stream to element
// =====================================================
function attachMediaStream(element, stream) {
  //console.log("DEPRECATED, attachMediaStream will soon be removed.");
  console.log("Success, media stream attached");
  element.srcObject = stream;
}

// =====================================================
// Check if there is peers
// =====================================================
function noPeers() {
  if (Object.keys(peers).length === 0) {
    return true;
  }
  return false;
}

// =====================================================
// Count talk time
// =====================================================
function startCountTime() {
  countTime.style.display = "inline";
  startTime = Date.now();
  setInterval(function printTime() {
    elapsedTime = Date.now() - startTime;
    countTime.innerHTML = getTimeToString(elapsedTime);
  }, 1000);
}

// =====================================================
// Return time to string
// =====================================================
function getTimeToString(time) {
  let diffInHrs = time / 3600000;
  let hh = Math.floor(diffInHrs);

  let diffInMin = (diffInHrs - hh) * 60;
  let mm = Math.floor(diffInMin);

  let diffInSec = (diffInMin - mm) * 60;
  let ss = Math.floor(diffInSec);

  let formattedHH = hh.toString().padStart(2, "0");
  let formattedMM = mm.toString().padStart(2, "0");
  let formattedSS = ss.toString().padStart(2, "0");

  return `${formattedHH}:${formattedMM}:${formattedSS}`;
}

// =====================================================
// WebRTC left buttons
// =====================================================
function manageLeftButtons() {
  leftButtons = get("leftButtons");

  setCopyRoomBtn();
  setAudioBtn();
  setVideoBtn();
  setSwapCameraBtn();
  setScreenShareBtn();
  setFullScreenBtn();
  setSendMsgBtn();
  setChatRoomBtn();
  setChatEmojiBtn();
  setThemeBtn();
  setDevicesBtn();
  setAboutBtn();
  setLeaveRoomBtn();
  showLeftButtons();
}

// =====================================================
// Copy - share room url button click event
// =====================================================
function setCopyRoomBtn() {
  // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
  copyRoomBtn.addEventListener("click", async (e) => {
    copyRoomUrl();

    if (navigator.share) {
      try {
        // not add title and description to load metadata from url
        await navigator.share({ url: window.location.href });
        userLog("info", "Shared successfully!");
      } catch (error) {
        // This feature is available only in secure contexts (HTTPS),
        // in some or all supporting browsers.
        // console.error("navigator.share", error);
        return;
      }
    }
  });
}

// =====================================================
// Audio mute - unmute button click event
// =====================================================
function setAudioBtn() {
  audioBtn.addEventListener("click", (e) => {
    localMediaStream.getAudioTracks()[0].enabled = !localMediaStream.getAudioTracks()[0]
      .enabled;
    e.target.className =
      "fas fa-microphone" +
      (localMediaStream.getAudioTracks()[0].enabled ? "" : "-slash");
  });
}

// =====================================================
// Video hide - show button click event
// =====================================================
function setVideoBtn() {
  videoBtn.addEventListener("click", (e) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getVideoTracks
    localMediaStream.getVideoTracks()[0].enabled = !localMediaStream.getVideoTracks()[0]
      .enabled;
    e.target.className =
      "fas fa-video" +
      (localMediaStream.getVideoTracks()[0].enabled ? "" : "-slash");
  });
}

// =====================================================
// Check if can swap or not cam, if yes show the button else hide it
// =====================================================
function setSwapCameraBtn() {
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    const videoInput = devices.filter((device) => device.kind === "videoinput");
    if (videoInput.length > 1 && isMobileDevice) {
      // swap camera front - rear button click event for mobile
      swapCameraBtn.addEventListener("click", (e) => {
        swapCamera();
      });
    } else {
      swapCameraBtn.style.display = "none";
    }
  });
}

// =====================================================
// Check if can share a screen, if yes show button else hide it
// =====================================================
function setScreenShareBtn() {
  if (navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia) {
    // share screen on - off button click event
    screenShareBtn.addEventListener("click", (e) => {
      toggleScreenSharing();
    });
  } else {
    screenShareBtn.style.display = "none";
  }
}

// =====================================================
// Full screen button click event
// =====================================================
function setFullScreenBtn() {
  if (DetectRTC.browser.name != "Safari") {
    // detect esc from full screen mode
    document.addEventListener("fullscreenchange", function (e) {
      var fullscreenElement = document.fullscreenElement;
      if (!fullscreenElement) {
        fullScreenBtn.className = "fas fa-expand-alt";
      }
    });

    fullScreenBtn.addEventListener("click", (e) => {
      toggleFullScreen();
    });
  } else {
    fullScreenBtn.style.display = "none";
  }
}

// =====================================================
// Send quick message button click event
// =====================================================
function setSendMsgBtn() {
  sendMsgBtn.addEventListener("click", (e) => {
    sendMessage();
  });
}

// =====================================================
// Chat room buttons click event
// =====================================================
function setChatRoomBtn() {
  // adapt chat room for mobile
  setChatBoxMobile();

  // open hide chat room
  chatRoomBtn.addEventListener("click", (e) => {
    if (noPeers()) {
      userLog("info", "Can't Open Chat Room, no peer connection detected");
      return;
    }
    if (!isChatRoomVisible) {
      showChatRoom();
    } else {
      msgerDraggable.style.display = "none";
      isChatRoomVisible = false;
      e.target.className = "fas fa-comment";
    }
  });

  // show left buttons
  msgerButtons.addEventListener("click", (e) => {
    checkLeftButtons();
  });

  // ghost theme + undo
  msgerTheme.addEventListener("click", (e) => {
    if (mirotalkTheme == "ghost") return;

    if (e.target.className == "fas fa-ghost") {
      e.target.className = "fas fa-undo";
      document.documentElement.style.setProperty("--msger-bg", "transparent");
    } else {
      e.target.className = "fas fa-ghost";
      mirotalkTheme == "dark"
        ? document.documentElement.style.setProperty("--msger-bg", "#16171b")
        : document.documentElement.style.setProperty("--msger-bg", "black");
    }
  });

  // clean chat messages
  msgerClean.addEventListener("click", (e) => {
    cleanMessages();
  });

  // close chat room - show left button and time if hide
  msgerClose.addEventListener("click", (e) => {
    msgerDraggable.style.display = "none";
    chatRoomBtn.className = "fas fa-comment";
    isChatRoomVisible = false;
    showLeftButtons();
    checkCountTime();
  });

  // on input check 4emoji from map
  msgerInput.oninput = function () {
    for (var i in map) {
      var regex = new RegExp(escapeSpecialChars(i), "gim");
      this.value = this.value.replace(regex, map[i]);
    }
  };

  // chat send msg
  msgerSendBtn.addEventListener("click", (e) => {
    e.preventDefault(); // prevent refresh page

    const msg = msgerInput.value;
    if (!msg) return; // empity msg

    emitMsg(myChatName, msg, "chat");
    appendMessage(myChatName, myChatAvatar, "right", msg);

    msgerInput.value = "";
  });
}

// Escape Special Chars
function escapeSpecialChars(regex) {
  return regex.replace(/([()[{*+.$^\\|?])/g, "\\$1");
}

// =====================================================
// Emoji picker chat room button click event
// =====================================================
function setChatEmojiBtn() {
  if (isMobileDevice) {
    // mobile already have it
    msgerEmojiBtn.style.display = "none";
  } else {
    // make emoji picker draggable for desktop
    dragElement(msgerEmojiPicker, msgerEmojiHeader);

    msgerEmojiBtn.addEventListener("click", (e) => {
      e.preventDefault(); // prevent refresh page
      hideShowEmojiPicker();
    });

    msgerCloseEmojiBtn.addEventListener("click", (e) => {
      e.preventDefault(); // prevent refresh page
      hideShowEmojiPicker();
    });

    emojiPicker.addEventListener("emoji-click", (e) => {
      //console.log(e.detail);
      //console.log(e.detail.emoji.unicode);
      msgerInput.value += e.detail.emoji.unicode;
    });
  }
}

// =====================================================
// Theme button click event
// =====================================================
function setThemeBtn() {
  themeBtn.addEventListener("click", (e) => {
    getTheme();
  });
}

// =====================================================
// Devices button click event
// =====================================================
function setDevicesBtn() {
  myDevicesBtn.addEventListener("click", (e) => {
    hideShowDevices();
  });
  myDevicesCloseBtn.addEventListener("click", (e) => {
    hideShowDevices();
  });
  if (!isMobileDevice) {
    // make chat room draggable for desktop
    dragElement(myDevices, myDeviceHeader);
  }
}

// =====================================================
// About button click event
// =====================================================
function setAboutBtn() {
  aboutBtn.addEventListener("click", (e) => {
    getAbout();
  });
}

// =====================================================
// Leave room button click event
// =====================================================
function setLeaveRoomBtn() {
  leaveRoomBtn.addEventListener("click", (e) => {
    leaveRoom();
  });
}

// =====================================================
// Set the chat room on full screen mode for mobile
// =====================================================
function setChatBoxMobile() {
  if (isMobileDevice) {
    document.documentElement.style.setProperty("--msger-height", "98vh");
    document.documentElement.style.setProperty("--msger-width", "98vw");
  } else {
    // make chat room draggable for desktop
    dragElement(msgerDraggable, msgerHeader);
    // $("#msgerDraggable").draggable(); https://jqueryui.com/draggable/ declined, can't select chat room texts...
  }
}

// =====================================================
// Make chat room - devices draggable
// =====================================================
function dragElement(elmnt, dragObj) {
  // https://www.w3schools.com/howto/howto_js_draggable.asp
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  if (dragObj) {
    // if present, the header is where you move the DIV from:
    dragObj.onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }
  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// =====================================================
// Resize video elements
// =====================================================
function resizeVideos() {
  const numToString = ["", "one", "two", "three", "four", "five", "six"];
  const videos = document.querySelectorAll(".video");
  document.querySelectorAll(".video").forEach((v) => {
    v.className = "video " + numToString[videos.length];
  });
}

// =====================================================
// Send quick message to peers
// =====================================================
function sendMessage() {
  if (noPeers()) {
    userLog("info", "Can't Send msg, no peer connection detected");
    return;
  }
  Swal.fire({
    background: swalBackground,
    position: "center",
    input: "text",
    inputLabel: "Send Message",
    inputPlaceholder: "Type your message here...",
    inputAttributes: {
      "aria-label": "Type your message here",
    },
    showDenyButton: true,
    confirmButtonText: `Send`,
    denyButtonText: `Close`,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      let msg = result.value;
      emitMsg("simple", msg, "simple");
    }
  });
}

// =====================================================
// Called when a message is recieved over the dataChannel
// =====================================================
function showMessage(msg) {
  Swal.fire({
    background: swalBackground,
    position: "center",
    title: "New Message",
    text: msg,
    input: "text",
    inputPlaceholder: "Type your message here...",
    inputAttributes: {
      "aria-label": "Type your message here",
    },
    showDenyButton: true,
    confirmButtonText: `Reply`,
    denyButtonText: `Close`,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      let msg = result.value;
      emitMsg("simple", msg, "simple");
    }
  });
}

// =====================================================
// Chat room form
// =====================================================
function showChatRoom() {
  if (!myChatName) {
    Swal.fire({
      background: swalBackground,
      position: "center",
      icon: "info",
      title: "Enter a name for chat",
      input: "text",
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp",
      },
      inputValidator: (value) => {
        if (!value) {
          return "Please enter a name for chat";
        }
        myChatName = value;
        showMsgerDraggable();
      },
    });
  } else {
    // chat name already set just open chat room
    showMsgerDraggable();
  }
}

// =====================================================
// Show msger draggable
// =====================================================
function showMsgerDraggable() {
  chatRoomBtn.className = "fas fa-comment-slash";
  msgerDraggable.style.display = "flex";
  checkCountTime();
  isChatRoomVisible = true;
}

// =====================================================
// Show left buttons for 10 seconds on body mousemove
// =====================================================
function showLeftButtons() {
  if (isButtonsVisible || isChatRoomVisible) return;
  leftButtons.style.display = "flex";
  isButtonsVisible = true;
  setTimeout(function () {
    leftButtons.style.display = "none";
    isButtonsVisible = false;
  }, 10000);
}

// =====================================================
// Hide - show left buttons
// =====================================================
function checkLeftButtons() {
  if (isButtonsVisible) {
    leftButtons.style.display = "none";
    isButtonsVisible = false;
    return;
  }
  leftButtons.style.display = "flex";
  isButtonsVisible = true;
}

// =====================================================
// Hide - show count time
// =====================================================
function checkCountTime() {
  if (isMobileDevice) {
    if (countTime.style.display == "none") {
      countTime.style.display = "inline";
      return;
    }
    countTime.style.display = "none";
  }
}

// =====================================================
// Hide - Show emoji picker div
// =====================================================
function hideShowEmojiPicker() {
  if (!isChatEmojiVisible) {
    msgerEmojiPicker.style.display = "block";
    isChatEmojiVisible = true;
    return;
  }
  msgerEmojiPicker.style.display = "none";
  isChatEmojiVisible = false;
}

// =====================================================
// Hide - show devices div
// =====================================================
function hideShowDevices() {
  if (!isAudioVideoDevicesVisible) {
    if (noPeers()) {
      userLog("info", "Can't setup devices, no peer connection detected");
      return;
    }
    myDevices.style.display = "block";
    isAudioVideoDevicesVisible = true;
    return;
  }
  myDevices.style.display = "none";
  isAudioVideoDevicesVisible = false;
}

// =====================================================
// Append Message to msger chat room
// =====================================================
function appendMessage(name, img, side, text) {
  let ctext = detectUrl(text);
  const msgHTML = `
	<div class="msg ${side}-msg">
		<div class="msg-img" style="background-image: url(${img})"></div>
		<div class="msg-bubble">
		<div class="msg-info">
			<div class="msg-info-name">${name}</div>
			<div class="msg-info-time">${getFormatDate(new Date())}</div>
		</div>
		<div class="msg-text">${ctext}</div>
		</div>
	</div>
  `;
  msgerChat.insertAdjacentHTML("beforeend", msgHTML);
  msgerChat.scrollTop += 500;
}

// =====================================================
// Detect url from text and make it clickable
// =====================================================
function detectUrl(text) {
  var urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, function (url) {
    return (
      '<div id="chat-msg"><a href="' +
      url +
      '" target="_blank">' +
      url +
      "</a></div>"
    );
  });
}

// =====================================================
// Clean chat messages
// =====================================================
function cleanMessages() {
  Swal.fire({
    background: swalBackground,
    position: "center",
    title: "Clean up chat Messages?",
    icon: "warning",
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
    // clean message
    if (result.isConfirmed) {
      var msgs = msgerChat.firstChild;
      while (msgs) {
        msgerChat.removeChild(msgs);
        msgs = msgerChat.firstChild;
      }
    }
  });
}

// =====================================================
// Send message over signaling server
// =====================================================
function emitMsg(name, msg, type) {
  if (msg) {
    signalingSocket.emit("msg", {
      peers: peers,
      name: name,
      msg: msg,
      type: type,
    });
    console.log("Send msg", {
      name: name,
      msg: msg,
    });
  }
}

// =====================================================
// Active - disactive screen sharing
// =====================================================
function toggleScreenSharing() {
  if (!isScreenStreaming) {
    if (noPeers()) {
      userLog(
        "info",
        "Can't Toggle screen sharing, no peer connection detected"
      );
      return;
    }
  }

  const constraints = {
    video: true,
  };

  let screenMediaPromise;

  if (!isScreenStreaming) {
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
    videoBtn.className = "fas fa-video"; // make sure to enable video
  }
  screenMediaPromise
    .then((screenStream) => {
      isScreenStreaming = !isScreenStreaming;
      for (var peer_id in peers) {
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
        var sender = peers[peer_id]
          .getSenders()
          .find((s) => (s.track ? s.track.kind === "video" : false));
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
        sender.replaceTrack(screenStream.getVideoTracks()[0]);
      }

      screenStream.getVideoTracks()[0].enabled = true;
      // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
      const newStream = new MediaStream([
        screenStream.getVideoTracks()[0],
        localMediaStream.getAudioTracks()[0],
      ]);
      localMediaStream = newStream;

      // attachMediaStream is a part of the adapter.js library
      attachMediaStream(myVideo, localMediaStream); // newstream

      myVideo.classList.toggle("mirror");
      screenShareBtn.classList.toggle("active");
      screenShareBtn.className = isScreenStreaming
        ? "fas fa-stop-circle"
        : "fas fa-desktop";

      screenStream.getVideoTracks()[0].onended = function () {
        if (isScreenStreaming) toggleScreenSharing();
      };
    })
    .catch((e) => {
      console.error("[Error] Unable to share the screen", e);
      userLog("error", "Unable to share the screen");
    });
}

// =====================================================
// Enter - esc on full screen mode
// =====================================================
function toggleFullScreen() {
  // https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    fullScreenBtn.className = "fas fa-compress-alt";
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      fullScreenBtn.className = "fas fa-expand-alt";
    }
  }
}

// =====================================================
// SwapCamer front (user) - rear (environment)
// =====================================================
function swapCamera() {
  if (noPeers()) {
    userLog("info", "Can't Swap the Camera, no peer connection detected");
    return;
  }

  camera = camera == "user" ? "environment" : "user";
  if (camera == "user") useVideo = true;
  else useVideo = { facingMode: { exact: camera } };

  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  navigator.mediaDevices
    .getUserMedia({ video: useVideo })
    .then((camStream) => {
      for (var peer_id in peers) {
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
        var sender = peers[peer_id]
          .getSenders()
          .find((s) => (s.track ? s.track.kind === "video" : false));
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
        sender.replaceTrack(camStream.getVideoTracks()[0]);
      }

      camStream.getVideoTracks()[0].enabled = true;
      // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
      const newStream = new MediaStream([
        camStream.getVideoTracks()[0],
        localMediaStream.getAudioTracks()[0],
      ]);
      localMediaStream = newStream;

      // attachMediaStream is a part of the adapter.js library
      attachMediaStream(myVideo, localMediaStream);

      myVideo.classList.toggle("mirror");
    })
    .catch((e) => {
      console.log("[Error] to swaping camera", e);
      userLog("error", "Error to swaping the camera");
    });
}

// =====================================================
// Copy room url to clipboard and share it
// =====================================================
function copyRoomUrl() {
  var tmpInput = document.createElement("input");
  let ROOM_URL = window.location.href;
  document.body.appendChild(tmpInput);
  tmpInput.value = ROOM_URL;
  tmpInput.select();
  tmpInput.setSelectionRange(0, 99999); /* For mobile devices */
  document.execCommand("copy");
  console.log("Copied to clipboard Join Link ", ROOM_URL);
  Swal.fire({
    background: swalBackground,
    position: "center",
    icon: "success",
    title: "Copied to clipboard",
    text: "Join link: " + ROOM_URL,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
    timer: 4000,
  });
  document.body.removeChild(tmpInput);
}

// =====================================================
// About info
// =====================================================
function getAbout() {
  Swal.fire({
    background: swalBackground,
    position: "center",
    title: "<strong>Made with ❤️</strong>",
    imageAlt: "mirotalk",
    imageUrl: loaderGif,
    imageWidth: 320,
    imageHeight: 240,
    html: `<div id="about"><b>Open Source</b> project on<a href="https://github.com/miroslavpejic85/mirotalk" target="_blank"><h2><strong> GitHub </strong></h2></a></div>`,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  });
}

// =====================================================
// Select theme and set it
// =====================================================
function getTheme() {
  Swal.fire({
    background: swalBackground,
    position: "center",
    title: "Select mirotalk theme",
    input: "select",
    inputOptions: {
      neon: "mirotalk-neon",
      dark: "mirotalk-dark",
      ghost: "mirotalk-ghost",
    },
    showDenyButton: true,
    confirmButtonText: `Apply`,
    denyButtonText: `Cancel`,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
    inputValidator: (theme) => {
      setTheme(theme);
    },
  });
}

// =====================================================
// Leave the Room and create a new one
// =====================================================
function leaveRoom() {
  Swal.fire({
    background: swalBackground,
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
        background: swalBackground,
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
      playSound("error");
      break;
    case "info":
      Swal.fire({
        background: swalBackground,
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

// =====================================================
// Sound notifications
// =====================================================
async function playSound(state) {
  if (!notifyBySound) return;

  let file_audio = "";
  switch (state) {
    case "addPeer":
      file_audio = "audio/add_peer.mp3";
      break;
    case "removePeer":
      file_audio = "audio/remove_peer.mp3";
      break;
    case "newMessage":
      file_audio = "audio/new_message.mp3";
      break;
    case "error":
      file_audio = "audio/error.mp3";
      break;
    // ...
    default:
      console.log("no file audio");
  }
  if (file_audio != "") {
    let audioToPlay = new Audio(file_audio);
    try {
      await audioToPlay.play();
    } catch (e) {
      // console.error("Cannot play sound", e);
      // Automatic playback failed. (safari)
      return;
    }
  }
}

// =====================================================
// Set mirotalk theme neon - dark - ...
// =====================================================
function setTheme(theme) {
  mirotalkTheme = theme;
  switch (mirotalkTheme) {
    case "neon":
      // neon theme
      swalBackground = "transparent";
      document.documentElement.style.setProperty("--body-bg", "black");
      document.documentElement.style.setProperty("--msger-bg", "black");
      document.documentElement.style.setProperty("--left-msg-bg", "#da05f3");
      document.documentElement.style.setProperty("--right-msg-bg", "#579ffb");
      document.documentElement.style.setProperty("--btn-bg", "white");
      document.documentElement.style.setProperty("--btn-opc", "1");
      document.documentElement.style.setProperty("--btns-left", "20px");
      document.documentElement.style.setProperty(
        "--box-shadow",
        "5px 5px 10px #0500ff, -5px -5px 10px #da05f3"
      );
      break;
    case "dark":
      // dark theme
      swalBackground = "transparent";
      document.documentElement.style.setProperty("--body-bg", "#16171b");
      document.documentElement.style.setProperty("--msger-bg", "#16171b");
      document.documentElement.style.setProperty("--left-msg-bg", "#222328");
      document.documentElement.style.setProperty("--right-msg-bg", "#0a0b0c");
      document.documentElement.style.setProperty("--btn-bg", "white");
      document.documentElement.style.setProperty("--btn-opc", "1");
      document.documentElement.style.setProperty("--btns-left", "20px");
      document.documentElement.style.setProperty(
        "--box-shadow",
        "5px 5px 10px #0a0b0c, -5px -5px 10px #222328"
      );
      break;
    case "ghost":
      // ghost theme
      swalBackground = "transparent";
      document.documentElement.style.setProperty("--body-bg", "black");
      document.documentElement.style.setProperty("--msger-bg", "transparent");
      document.documentElement.style.setProperty("--btn-bg", "white");
      document.documentElement.style.setProperty("--btn-opc", "0.7");
      document.documentElement.style.setProperty("--btns-left", "2px");
      document.documentElement.style.setProperty("--box-shadow", "0px");
      document.documentElement.style.setProperty(
        "--left-msg-bg",
        "transparent"
      );
      document.documentElement.style.setProperty(
        "--right-msg-bg",
        "transparent"
      );
      break;
    // ...
    default:
      console.log("No theme found");
  }
}

// Utils
function get(id) {
  return document.getElementById(id);
}
function getS(selector) {
  return document.querySelector(selector);
}

// Date now
function getFormatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();
  return `${h.slice(-2)}:${m.slice(-2)}`;
}
