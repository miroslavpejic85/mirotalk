/*
 ██████ ██      ██ ███████ ███    ██ ████████ 
██      ██      ██ ██      ████   ██    ██    
██      ██      ██ █████   ██ ██  ██    ██    
██      ██      ██ ██      ██  ██ ██    ██    
 ██████ ███████ ██ ███████ ██   ████    ██    
*/

"use strict"; // https://www.w3schools.com/js/js_strict.asp

const welcomeImg = "../images/illustration-section-01.svg";
const shareUrlImg = "../images/illustration-section-01.svg";
const leaveRoomImg = "../images/illustration-section-01.svg";
const aboutImg = "../images/preview.png";
const myChatAvatar = "../images/programmer.svg";
const friendChatAvatar = "../images/friend.svg";
const peerLoockupUrl = "https://extreme-ip-lookup.com/json/";
const notifyBySound = true; // turn on - off sound notifications
const notifyAddPeer = "../audio/addPeer.mp3";
const notifyRemovePeer = "../audio/removePeer.mp3";
const notifyNewMessage = "../audio/newMessage.mp3";
const notifyRecStart = "../audio/recStart.mp3";
const notifyRecStop = "../audio/recStop.mp3";
const notifyError = "../audio/error.mp3";
const isWebRTCSupported = DetectRTC.isWebRTCSupported;
const isMobileDevice = DetectRTC.isMobileDevice;

var callStartTime;
var callElapsedTime;
var recStartTime;
var recElapsedTime;
var mirotalkTheme = "neon"; // neon - dark - ghost ...
var swalBackground = "transparent"; // black - #16171b ...
var signalingServerPort = 3000; // must be same of server PORT
var signalingServer = getServerUrl();
var roomId = getRoomId();
var peerInfo = getPeerInfo();
var peerGeo;
var peerConnection;
var myPeerName;
var useAudio = true;
var useVideo = true;
var camera = "user";
var myVideoChange = false;
var myVideoStatus = true;
var myAudioStatus = true;
var isScreenStreaming = false;
var isChatRoomVisible = false;
var isChatEmojiVisible = false;
var isButtonsVisible = false;
var isMySettingsVisible = false;
var isVideoOnFullScreen = false;
var isDocumentOnFullScreen = false;
var signalingSocket; // socket.io connection to our webserver
var localMediaStream; // my microphone / webcam
var remoteMediaStream; // peers microphone / webcam
var remoteMediaControls = false; // enable - disable peers video player controls (default false)
var peerConnections = {}; // keep track of our peer connections, indexed by peer_id == socket.io id
var peerMediaElements = {}; // keep track of our peer <video> tags, indexed by peer_id
var chatMessages = []; // collect chat messages to save it later if want
var iceServers = [{ urls: "stun:stun.l.google.com:19302" }]; // backup iceServers

var chatInputEmoji = {
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
}; // https://github.com/wooorm/gemoji/blob/main/support.md

var countTime;
// left buttons
var leftButtons;
var shareRoomBtn;
var audioBtn;
var videoBtn;
var swapCameraBtn;
var screenShareBtn;
var fullScreenBtn;
var chatRoomBtn;
var mySettingsBtn;
var aboutBtn;
var leaveRoomBtn;
// chat room elements
var msgerDraggable;
var msgerHeader;
var msgerTheme;
var msgerClean;
var msgerEmojiBtn;
var msgerSaveBtn;
var msgerClose;
var msgerChat;
var msgerInput;
var msgerSendBtn;
// chat room emoji picker
var msgerEmojiPicker;
var msgerEmojiHeader;
var msgerCloseEmojiBtn;
var emojiPicker;
// my settings
var mySettings;
var mySettingsHeader;
var mySettingsCloseBtn;
var myPeerNameSet;
var myPeerNameSetBtn;
var audioInputSelect;
var audioOutputSelect;
var videoSelect;
var themeSelect;
var selectors;
// my video element
var myVideo;
// Name && video audio - status
var myVideoParagraph;
var myVideoStatusIcon;
var myAudioStatusIcon;
// record Media Stream
var recordStreamBtn;
var mediaRecorder;
var recordedBlobs;
var isStreamRecording = false;

/**
 * Load all Html elements by Id
 */
function getHtmlElementsById() {
  countTime = getId("countTime");
  myVideo = getId("myVideo");
  // left buttons
  leftButtons = getId("leftButtons");
  shareRoomBtn = getId("shareRoomBtn");
  audioBtn = getId("audioBtn");
  videoBtn = getId("videoBtn");
  swapCameraBtn = getId("swapCameraBtn");
  screenShareBtn = getId("screenShareBtn");
  fullScreenBtn = getId("fullScreenBtn");
  chatRoomBtn = getId("chatRoomBtn");
  mySettingsBtn = getId("mySettingsBtn");
  aboutBtn = getId("aboutBtn");
  leaveRoomBtn = getId("leaveRoomBtn");
  // chat Room elements
  msgerDraggable = getId("msgerDraggable");
  msgerHeader = getId("msgerHeader");
  msgerTheme = getId("msgerTheme");
  msgerClean = getId("msgerClean");
  msgerEmojiBtn = getId("msgerEmojiBtn");
  msgerSaveBtn = getId("msgerSaveBtn");
  msgerClose = getId("msgerClose");
  msgerChat = getId("msgerChat");
  msgerInput = getId("msgerInput");
  msgerSendBtn = getId("msgerSendBtn");
  // chat room emoji picker
  msgerEmojiPicker = getId("msgerEmojiPicker");
  msgerEmojiHeader = getId("msgerEmojiHeader");
  msgerCloseEmojiBtn = getId("msgerCloseEmojiBtn");
  emojiPicker = getSl("emoji-picker");
  // my settings
  mySettings = getId("mySettings");
  mySettingsHeader = getId("mySettingsHeader");
  mySettingsCloseBtn = getId("mySettingsCloseBtn");
  myPeerNameSet = getId("myPeerNameSet");
  myPeerNameSetBtn = getId("myPeerNameSetBtn");
  audioInputSelect = getId("audioSource");
  audioOutputSelect = getId("audioOutput");
  videoSelect = getId("videoSource");
  themeSelect = getId("mirotalkTheme");
  // my conference name, video - audio status
  myVideoParagraph = getId("myVideoParagraph");
  myVideoStatusIcon = getId("myVideoStatusIcon");
  myAudioStatusIcon = getId("myAudioStatusIcon");
  recordStreamBtn = getId("recordStreamBtn");
}

/**
 * Get peer info using DetecRTC
 * https://github.com/muaz-khan/DetectRTC
 * @return Json peer info
 */
function getPeerInfo() {
  return {
    detectRTCversion: DetectRTC.version,
    isWebRTCSupported: DetectRTC.isWebRTCSupported,
    isMobileDevice: DetectRTC.isMobileDevice,
    osName: DetectRTC.osName,
    osVersion: DetectRTC.osVersion,
    browserName: DetectRTC.browser.name,
    browserVersion: DetectRTC.browser.version,
  };
}

/**
 * Get approximative peer geolocation
 * @return json
 */
function getPeerGeoLocation() {
  fetch(peerLoockupUrl)
    .then((res) => res.json())
    .then((outJson) => {
      peerGeo = outJson;
    })
    .catch((err) => console.error(err));
}

/**
 * Get Signaling server url
 * @return Signaling server Url
 */
function getServerUrl() {
  return (
    "http" +
    (location.hostname == "localhost" ? "" : "s") +
    "://" +
    location.hostname +
    (location.hostname == "localhost" ? ":" + signalingServerPort : "")
  );
}

/**
 * Generate random Room id
 * @return Room Id
 */
function getRoomId() {
  // skip /join/
  let roomId = location.pathname.substring(6);
  // if not specified room id, create one random
  if (roomId == "") {
    roomId = makeId(12);
    const newurl = signalingServer + "/join/" + roomId;
    window.history.pushState({ url: newurl }, roomId, newurl);
  }
  return roomId;
}

/**
 * Generate random Id
 * @param {*} length
 * @returns random id
 */
function makeId(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Check if there is peer connections
 * @return true, false otherwise
 */
function thereIsPeerConnections() {
  if (Object.keys(peerConnections).length === 0) {
    return false;
  }
  return true;
}

/**
 * On body load Get started
 */
function initPeer() {
  // set mirotalk theme
  setTheme(mirotalkTheme);

  // check if peer is done for WebRTC
  if (!isWebRTCSupported) {
    console.error("isWebRTCSupported: false");
    userLog("error", "This browser seems not supported WebRTC!");
    return;
  }

  // peer ready for WebRTC! :)
  console.log("Connecting to signaling server");
  signalingSocket = io(signalingServer);

  /**
   * Once the user has given us access to their
   * microphone/camcorder, join the channel
   * and start peering up
   */
  signalingSocket.on("connect", function () {
    console.log("Connected to signaling server");
    if (localMediaStream) joinToChannel();
    else
      setupLocalMedia(function () {
        whoAreYou();
      });
  });

  /**
   * set your name 4 conference
   */
  function whoAreYou() {
    playSound("newMessage");

    Swal.fire({
      allowOutsideClick: false,
      background: swalBackground,
      position: "center",
      imageAlt: "mirotalk-name",
      imageUrl: welcomeImg,
      title: "Enter your name",
      input: "text",
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp",
      },
      inputValidator: (value) => {
        if (!value) {
          return "Please enter youre name";
        }
        myPeerName = value;
        myVideoParagraph.innerHTML = myPeerName;
        joinToChannel();
      },
    }).then(function () {
      welcomeUser();
    });
  }

  /**
   * join to chennel and send some peer info
   */
  function joinToChannel() {
    console.log("join to channel", roomId);
    signalingSocket.emit("join", {
      channel: roomId,
      peerInfo: peerInfo,
      peerGeo: peerGeo,
      peerName: myPeerName,
      peerVideo: myVideoStatus,
      peerAudio: myAudioStatus,
    });
  }

  /**
   * welcome message
   */
  function welcomeUser() {
    const myRoomUrl = window.location.href;
    playSound("newMessage");
    copyRoomURL();
    Swal.fire({
      background: swalBackground,
      position: "center",
      title: "<strong>Welcome " + myPeerName + "</strong>",
      imageAlt: "mirotalk-welcome",
      imageUrl: welcomeImg,
      html:
        `
      <br/> 
      Share this URL to join on this call.
      <p style="color:rgb(8, 189, 89);">` +
        myRoomUrl +
        `</p>`,
      confirmButtonText: `Copy URL`,
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp",
      },
    });
  }

  /**
   * Tear down all of our peer connections
   * and remove all the media divs when we disconnect
   */
  signalingSocket.on("disconnect", function () {
    console.log("Disconnected from signaling server");
    for (var peer_id in peerMediaElements) {
      document.body.removeChild(peerMediaElements[peer_id].parentNode);
      resizeVideos();
    }
    for (var peer_id in peerConnections) {
      peerConnections[peer_id].close();
    }
    peerConnections = {};
    peerMediaElements = {};
  });

  /**
   * When we join a group, our signaling server will send out 'addPeer' events to each pair
   * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
   * in the channel you will connect directly to the other 5, so there will be a total of 15
   * connections in the network).
   */
  signalingSocket.on("addPeer", function (config) {
    // console.log("addPeer", JSON.stringify(config));

    var peer_id = config.peer_id;
    var peers = config.peers;

    if (peer_id in peerConnections) {
      // This could happen if the user joins multiple channels where the other peer is also in.
      console.log("Already connected to peer", peer_id);
      return;
    }

    if (config.iceServers) iceServers = config.iceServers;
    console.log("iceServers", iceServers[0]);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    peerConnection = new RTCPeerConnection({ iceServers: iceServers });

    // collect peer connections
    peerConnections[peer_id] = peerConnection;
    playSound("addPeer");

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
    peerConnections[peer_id].onicecandidate = function (event) {
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

    /**
     * WebRTC: onaddstream is deprecated! Use peerConnection.ontrack instead (done)
     * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onaddstream
     * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/ontrack
     */
    let ontrackCount = 0;
    peerConnections[peer_id].ontrack = function (event) {
      ontrackCount++;
      if (ontrackCount === 2) {
        console.log("ontrack", event);
        remoteMediaStream = event.streams[0];

        const videoWrap = document.createElement("div");

        // handle peers name video audio status
        const remoteVideoParagraph = document.createElement("h4");
        const remoteVideoStatusIcon = document.createElement("button");
        const remoteAudioStatusIcon = document.createElement("button");

        // remote peer name element
        remoteVideoParagraph.setAttribute("id", peer_id + "_name");
        remoteVideoParagraph.className = "videoPeerName";
        const peerVideoText = document.createTextNode(
          peers[peer_id]["peer_name"]
        );
        remoteVideoParagraph.appendChild(peerVideoText);
        // remote video status element
        remoteVideoStatusIcon.setAttribute("id", peer_id + "_videoStatus");
        remoteVideoStatusIcon.className = "fas fa-video videoStatusIcon";
        // remote audio status element
        remoteAudioStatusIcon.setAttribute("id", peer_id + "_audioStatus");
        remoteAudioStatusIcon.className = "fas fa-microphone audioStatusIcon";

        // add elements to videoWrap div
        videoWrap.appendChild(remoteVideoParagraph);
        videoWrap.appendChild(remoteVideoStatusIcon);
        videoWrap.appendChild(remoteAudioStatusIcon);

        const remoteMedia = document.createElement("video");
        videoWrap.className = "video";
        videoWrap.appendChild(remoteMedia);
        remoteMedia.setAttribute("id", peer_id + "_video");
        remoteMedia.setAttribute("playsinline", true);
        remoteMedia.mediaGroup = "remotevideo";
        remoteMedia.autoplay = true;
        isMobileDevice
          ? (remoteMediaControls = false)
          : (remoteMediaControls = remoteMediaControls);
        remoteMedia.controls = remoteMediaControls;
        peerMediaElements[peer_id] = remoteMedia;
        document.body.appendChild(videoWrap);
        // attachMediaStream is a part of the adapter.js library
        attachMediaStream(remoteMedia, remoteMediaStream);
        resizeVideos();

        if (!isMobileDevice) {
          handleVideoPlayerFs(peer_id + "_video");
        }

        // refresh remote peers video icon status
        getId(peer_id + "_videoStatus").className =
          "fas fa-video" +
          (peers[peer_id]["peer_video"] ? "" : "-slash") +
          " videoStatusIcon";

        // refresh remote peers audio icon status
        getId(peer_id + "_audioStatus").className =
          "fas fa-microphone" +
          (peers[peer_id]["peer_audio"] ? "" : "-slash") +
          " audioStatusIcon";
      }
    };

    /**
     * peerConnections[peer_id].addStream(localMediaStream); // no longer raccomanded
     * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addStream
     * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
     */
    localMediaStream.getTracks().forEach(function (track) {
      peerConnections[peer_id].addTrack(track, localMediaStream);
    });

    /**
     * Only one side of the peer connection should create the
     * offer, the signaling server picks one to be the offerer.
     * The other user will get a 'sessionDescription' event and will
     * create an offer, then send back an answer 'sessionDescription' to us
     */
    if (config.should_create_offer) {
      console.log("Creating RTC offer to", peer_id);
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
      peerConnections[peer_id]
        .createOffer()
        .then(function (local_description) {
          console.log("Local offer description is", local_description);
          // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
          peerConnections[peer_id]
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
    var remote_description = config.session_description;

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription
    var description = new RTCSessionDescription(remote_description);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription
    peerConnections[peer_id]
      .setRemoteDescription(description)
      .then(function () {
        console.log("setRemoteDescription done!");
        if (remote_description.type == "offer") {
          console.log("Creating answer");
          // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
          peerConnections[peer_id]
            .createAnswer()
            .then(function (local_description) {
              console.log("Answer description is: ", local_description);
              // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
              peerConnections[peer_id]
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
    var peer_id = config.peer_id;
    var ice_candidate = config.ice_candidate;
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate
    peerConnections[peer_id].addIceCandidate(
      new RTCIceCandidate(ice_candidate)
    );
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
    if (peer_id in peerConnections) {
      peerConnections[peer_id].close();
    }

    delete peerConnections[peer_id];
    delete peerMediaElements[peer_id];
    playSound("removePeer");
  });

  // show chat messages
  signalingSocket.on("onMessage", function (config) {
    console.log("Receive msg", { msg: config.msg });
    if (!isChatRoomVisible) {
      showChatRoomDraggable();
      chatRoomBtn.className = "fas fa-comment-slash";
    }
    playSound("newMessage");
    appendMessage(config.name, friendChatAvatar, "left", config.msg);
  });

  // refresh peers name
  signalingSocket.on("onCName", function (config) {
    appendPeerName(config.peer_id, config.peer_name);
  });

  // refresh peers video - audio icon status
  signalingSocket.on("onVAStatus", function (config) {
    var peer_id = config.peer_id;
    var element = config.element;
    var status = config.status;

    switch (element) {
      case "video":
        getId(peer_id + "_videoStatus").className =
          "fas fa-video" + (status ? "" : "-slash") + " videoStatusIcon";
        break;
      case "audio":
        getId(peer_id + "_audioStatus").className =
          "fas fa-microphone" + (status ? "" : "-slash") + " audioStatusIcon";
        break;
    }
  });
} // end [initPeer]

/**
 * Set mirotalk theme neon - dark - ghost
 * @param {*} theme
 */
function setTheme(theme) {
  if (!theme) return;

  mirotalkTheme = theme;
  switch (mirotalkTheme) {
    case "neon":
      // neon theme
      swalBackground = "rgba(0, 0, 0, 0.7)";
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
      swalBackground = "rgba(0, 0, 0, 0.7)";
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

/**
 * Setup local media stuff
 * @param {*} callback
 * @param {*} errorback
 */
function setupLocalMedia(callback, errorback) {
  // if we've already been initialized do nothing
  if (localMediaStream != null) {
    if (callback) callback();
    return;
  }

  getPeerGeoLocation();

  /**
   * Ask user for permission to use the computers microphone and/or camera,
   * attach it to an <audio> or <video> tag if they give us access.
   * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
   */
  console.log("Requesting access to local audio / video inputs");

  const constraints = {
    audio: useAudio,
    video: useVideo,
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      console.log("Access granted to audio/video");
      // hide img bg and loading div
      document.body.style.backgroundImage = "none";
      getId("loadingDiv").style.display = "none";

      stopWindowsStream();

      // need for recording stream later
      window.stream = stream;

      localMediaStream = stream;

      const videoWrap = document.createElement("div");
      // handle my peer name video audio status
      const myVideoParagraph = document.createElement("h4");
      const myVideoStatusIcon = document.createElement("button");
      const myAudioStatusIcon = document.createElement("button");

      // my peer name
      myVideoParagraph.setAttribute("id", "myVideoParagraph");
      myVideoParagraph.className = "videoPeerName";
      // my video status element
      myVideoStatusIcon.setAttribute("id", "myVideoStatusIcon");
      myVideoStatusIcon.className = "fas fa-video videoStatusIcon";
      // my audio status element
      myAudioStatusIcon.setAttribute("id", "myAudioStatusIcon");
      myAudioStatusIcon.className = "fas fa-microphone audioStatusIcon";

      // add elements to video wrap div
      videoWrap.appendChild(myVideoParagraph);
      videoWrap.appendChild(myVideoStatusIcon);
      videoWrap.appendChild(myAudioStatusIcon);

      const localMedia = document.createElement("video");
      videoWrap.className = "video";
      videoWrap.setAttribute("id", "myVideoWrap");
      videoWrap.appendChild(localMedia);
      localMedia.setAttribute("id", "myVideo");
      localMedia.setAttribute("playsinline", true);
      localMedia.className = "mirror";
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
      resizeVideos();

      getHtmlElementsById();
      manageLeftButtons();
      handleBodyOnMouseMove();
      setupMySettings();
      startCountTime();
      /*
      if (!isMobileDevice) {
        handleVideoPlayerFs("myVideo");
      }
      */
      if (callback) callback();
    })
    .catch((e) => {
      // user denied access to audio/video
      console.error("Access denied for audio/video", e);
      playSound("error");
      window.location.href = `/permission?roomId=${roomId}`;
      if (errorback) errorback();
    });
} // end [setup_local_stream]

/**
 * Resize video elements
 */
function resizeVideos() {
  const numToString = ["", "one", "two", "three", "four", "five", "six"];
  const videos = document.querySelectorAll(".video");
  document.querySelectorAll(".video").forEach((v) => {
    v.className = "video " + numToString[videos.length];
  });
}

/**
 * On video player click, go on full screen mode.
 * Press Esc to exit from full screen mode, or click again.
 * @param {*} videoId
 */
function handleVideoPlayerFs(videoId) {
  var videoPlayer = getId(videoId);

  // handle Chrome Firefox Opera Microsoft Edge videoPlayer ESC
  videoPlayer.addEventListener("fullscreenchange", function (e) {
    // if Controls enabled, or document on FS do nothing
    if (videoPlayer.controls || isDocumentOnFullScreen) return;
    var fullscreenElement = document.fullscreenElement;
    if (!fullscreenElement) {
      videoPlayer.style.pointerEvents = "auto";
      isVideoOnFullScreen = false;
      // console.log("Esc FS isVideoOnFullScreen", isVideoOnFullScreen);
    }
  });

  // handle Safari videoPlayer ESC
  videoPlayer.addEventListener("webkitfullscreenchange", function () {
    // if Controls enabled, or document on FS do nothing
    if (videoPlayer.controls || isDocumentOnFullScreen) return;
    var webkitIsFullScreen = document.webkitIsFullScreen;
    if (!webkitIsFullScreen) {
      videoPlayer.style.pointerEvents = "auto";
      isVideoOnFullScreen = false;
      // console.log("Esc FS isVideoOnFullScreen", isVideoOnFullScreen);
    }
  });

  videoPlayer.addEventListener("click", (e) => {
    // if Controls enabled, or document on FS do nothing
    if (videoPlayer.controls || isDocumentOnFullScreen) return;

    if (!isVideoOnFullScreen) {
      if (videoPlayer.requestFullscreen) {
        // Chrome Firefox Opera Microsoft Edge
        videoPlayer.requestFullscreen();
      } else if (videoPlayer.webkitRequestFullscreen) {
        // Safari request full screen mode
        videoPlayer.webkitRequestFullscreen();
      } else if (videoPlayer.msRequestFullscreen) {
        // IE11 request full screen mode
        videoPlayer.msRequestFullscreen();
      }
      isVideoOnFullScreen = true;
      videoPlayer.style.pointerEvents = "none";
      // console.log("Go on FS isVideoOnFullScreen", isVideoOnFullScreen);
    } else {
      if (document.exitFullscreen) {
        // Chrome Firefox Opera Microsoft Edge
        document.exitFullscreen();
      } else if (document.webkitCancelFullScreen) {
        // Safari exit full screen mode ( Not work... )
        document.webkitCancelFullScreen();
      } else if (document.msExitFullscreen) {
        // IE11 exit full screen mode
        document.msExitFullscreen();
      }
      isVideoOnFullScreen = false;
      videoPlayer.style.pointerEvents = "auto";
      // console.log("Esc FS isVideoOnFullScreen", isVideoOnFullScreen);
    }
  });
}

/**
 * Start talk time
 */
function startCountTime() {
  countTime.style.display = "inline";
  callStartTime = Date.now();
  setInterval(function printTime() {
    callElapsedTime = Date.now() - callStartTime;
    countTime.innerHTML = getTimeToString(callElapsedTime);
  }, 1000);
}

/**
 * Start recording time
 */
function startRecordingTime() {
  recStartTime = Date.now();
  var rc = setInterval(function printTime() {
    if (isStreamRecording) {
      recElapsedTime = Date.now() - recStartTime;
      myVideoParagraph.innerHTML =
        myPeerName + " 🔴 REC " + getTimeToString(recElapsedTime);
      return;
    }
    clearInterval(rc);
  }, 1000);
}

/**
 * Return time to string
 * @param {*} time
 */
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

/**
 * Handle WebRTC left buttons
 */
function manageLeftButtons() {
  setShareRoomBtn();
  setAudioBtn();
  setVideoBtn();
  setSwapCameraBtn();
  setScreenShareBtn();
  setRecordStreamBtn();
  setFullScreenBtn();
  setChatRoomBtn();
  setChatEmojiBtn();
  setMySettingsBtn();
  setAboutBtn();
  setLeaveRoomBtn();
  showLeftButtons();
}

/**
 * Copy - share room url button click event
 */
function setShareRoomBtn() {
  shareRoomBtn.addEventListener("click", async (e) => {
    shareRoomUrl();
  });
}

/**
 * Audio mute - unmute button click event
 */
function setAudioBtn() {
  audioBtn.addEventListener("click", (e) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getAudioTracks
    localMediaStream.getAudioTracks()[0].enabled = !localMediaStream.getAudioTracks()[0]
      .enabled;
    e.target.className =
      "fas fa-microphone" +
      (localMediaStream.getAudioTracks()[0].enabled ? "" : "-slash");
    // refresh my audio status to all peers in the room
    myAudioStatus = localMediaStream.getAudioTracks()[0].enabled;
    myAudioStatusIcon.className =
      "fas fa-microphone" +
      (myAudioStatus ? "" : "-slash") +
      " audioStatusIcon";
    emitVAStatus("audio", myAudioStatus);
  });
}

/**
 * Video hide - show button click event
 */
function setVideoBtn() {
  videoBtn.addEventListener("click", (e) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getVideoTracks
    localMediaStream.getVideoTracks()[0].enabled = !localMediaStream.getVideoTracks()[0]
      .enabled;
    e.target.className =
      "fas fa-video" +
      (localMediaStream.getVideoTracks()[0].enabled ? "" : "-slash");
    // refresh my video status to all peers in the room
    myVideoStatus = localMediaStream.getVideoTracks()[0].enabled;
    myVideoStatusIcon.className =
      "fas fa-video" + (myVideoStatus ? "" : "-slash") + " videoStatusIcon";
    emitVAStatus("video", myVideoStatus);
  });
}

/**
 * Check if can swap or not cam,
 * if yes show the button else hide it
 */
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

/**
 * Check if can share a screen,
 * if yes show button else hide it
 */
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

/**
 * Start - Stop Stream recording
 */
function setRecordStreamBtn() {
  recordStreamBtn.addEventListener("click", (e) => {
    if (isStreamRecording) {
      playSound("recStop");
      stopStreamRecording();
    } else {
      playSound("recStart");
      startStreamRecording();
    }
  });
}

/**
 * Full screen button click event
 */
function setFullScreenBtn() {
  if (DetectRTC.browser.name != "Safari") {
    // detect esc from full screen mode
    document.addEventListener("fullscreenchange", function (e) {
      var fullscreenElement = document.fullscreenElement;
      if (!fullscreenElement) {
        fullScreenBtn.className = "fas fa-expand-alt";
        isDocumentOnFullScreen = false;
      }
    });
    fullScreenBtn.addEventListener("click", (e) => {
      toggleFullScreen();
    });
  } else {
    fullScreenBtn.style.display = "none";
  }
}

/**
 * Chat room buttons click event
 */
function setChatRoomBtn() {
  // adapt chat room for mobile
  setChatRoomForMobile();

  // open hide chat room
  chatRoomBtn.addEventListener("click", (e) => {
    if (!isChatRoomVisible) {
      showChatRoomDraggable();
    } else {
      hideChatRoomAndEmojiPicker();
      e.target.className = "fas fa-comment";
    }
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

  // save chat messages to file
  msgerSaveBtn.addEventListener("click", (e) => {
    if (chatMessages.length != 0) {
      downloadChatMsgs();
      return;
    }
    userLog("info", "No chat messages to save");
  });

  // close chat room - show left button and time if hide
  msgerClose.addEventListener("click", (e) => {
    hideChatRoomAndEmojiPicker();
    showLeftButtons();
    checkCountTime();
  });

  // on input check 4emoji from map
  msgerInput.oninput = function () {
    for (var i in chatInputEmoji) {
      var regex = new RegExp(escapeSpecialChars(i), "gim");
      this.value = this.value.replace(regex, chatInputEmoji[i]);
    }
  };

  // chat send msg
  msgerSendBtn.addEventListener("click", (e) => {
    // prevent refresh page
    e.preventDefault();

    if (!thereIsPeerConnections()) {
      userLog("info", "Can't send message, no peer connection detected");
      msgerInput.value = "";
      return;
    }

    const msg = msgerInput.value;
    // empity msg
    if (!msg) return;

    emitMsg(myPeerName, msg);
    appendMessage(myPeerName, myChatAvatar, "right", msg);
    msgerInput.value = "";
  });
}

/**
 * Emoji picker chat room button click event
 */
function setChatEmojiBtn() {
  if (isMobileDevice) {
    // mobile already have it
    msgerEmojiBtn.style.display = "none";
  } else {
    // make emoji picker draggable for desktop
    dragElement(msgerEmojiPicker, msgerEmojiHeader);

    msgerEmojiBtn.addEventListener("click", (e) => {
      // prevent refresh page
      e.preventDefault();
      hideShowEmojiPicker();
    });

    msgerCloseEmojiBtn.addEventListener("click", (e) => {
      // prevent refresh page
      e.preventDefault();
      hideShowEmojiPicker();
    });

    emojiPicker.addEventListener("emoji-click", (e) => {
      //console.log(e.detail);
      //console.log(e.detail.emoji.unicode);
      msgerInput.value += e.detail.emoji.unicode;
    });
  }
}

/**
 * My settings button click event
 */
function setMySettingsBtn() {
  mySettingsBtn.addEventListener("click", (e) => {
    if (isMobileDevice) {
      leftButtons.style.display = "none";
      isButtonsVisible = false;
    }
    hideShowMySettings();
  });
  mySettingsCloseBtn.addEventListener("click", (e) => {
    hideShowMySettings();
  });
  myPeerNameSetBtn.addEventListener("click", (e) => {
    updateMyPeerName();
  });
  if (!isMobileDevice) {
    // make chat room draggable for desktop
    dragElement(mySettings, mySettingsHeader);
  }
}

/**
 * About button click event
 */
function setAboutBtn() {
  aboutBtn.addEventListener("click", (e) => {
    getAbout();
  });
}

/**
 * Leave room button click event
 */
function setLeaveRoomBtn() {
  leaveRoomBtn.addEventListener("click", (e) => {
    leaveRoom();
  });
}

/**
 * Handle left buttons show - hide on body mouse move
 */
function handleBodyOnMouseMove() {
  document.body.addEventListener("mousemove", (e) => {
    showLeftButtons();
  });
}

/**
 * Setup local audio - video devices - theme ...
 */
function setupMySettings() {
  // audio - video select box
  selectors = [audioInputSelect, audioOutputSelect, videoSelect];
  audioOutputSelect.disabled = !("sinkId" in HTMLMediaElement.prototype);
  navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
  audioInputSelect.addEventListener("change", (e) => {
    myVideoChange = false;
    refreshLocalMedia();
  });
  audioOutputSelect.addEventListener("change", (e) => {
    changeAudioDestination();
  });
  videoSelect.addEventListener("change", (e) => {
    if (isMobileDevice) myVideoChange = true;
    refreshLocalMedia();
  });
  themeSelect.addEventListener("change", (e) => {
    setTheme(themeSelect.value);
  });
}

/**
 * Refresh Local media audio video in - out
 */
function refreshLocalMedia() {
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

/**
 * Change Audio Output
 */
function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(myVideo, audioDestination);
}

/**
 * Attach audio output device to video element using device/sink ID.
 * @param {*} element
 * @param {*} sinkId
 */
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

/**
 * Got Stream and append to local media
 * @param {*} stream
 */
function gotStream(stream) {
  refreshMyStreamToPeers(stream);
  refreshMyLocalStream(stream);
  setMyVideoStatusTrue();
  if (myVideoChange) {
    myVideo.classList.toggle("mirror");
  }
  // Refresh button list in case labels have become available
  return navigator.mediaDevices.enumerateDevices();
}

/**
 * Get audio-video Devices and show it to select box
 * https://github.com/webrtc/samples/tree/gh-pages/src/content/devices/input-output
 * @param {*} deviceInfos
 */
function gotDevices(deviceInfos) {
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

/**
 * Handle getUserMedia error
 * @param {*} error
 */
function handleError(error) {
  console.log(
    "navigator.MediaDevices.getUserMedia error: ",
    error.message,
    error.name
  );
}

/**
 * AttachMediaStream stream to element
 * @param {*} element
 * @param {*} stream
 */
function attachMediaStream(element, stream) {
  //console.log("DEPRECATED, attachMediaStream will soon be removed.");
  console.log("Success, media stream attached");
  element.srcObject = stream;
}

/**
 * Show left buttons for 10 seconds on body mousemove
 * if mobile and chatroom open do nothing return
 * if mobile and mySettings open do nothing return
 */
function showLeftButtons() {
  if (
    isButtonsVisible ||
    (isMobileDevice && isChatRoomVisible) ||
    (isMobileDevice && isMySettingsVisible)
  ) {
    return;
  }
  leftButtons.style.display = "flex";
  isButtonsVisible = true;
  setTimeout(function () {
    leftButtons.style.display = "none";
    isButtonsVisible = false;
  }, 10000);
}

/**
 * Copy room url to clipboard and share it with navigator share if supported
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
 */
async function shareRoomUrl() {
  copyRoomURL();

  // navigator share
  let isSupportedNavigatorShare = false;
  let errorNavigatorShare = false;
  // if supported
  if (navigator.share) {
    isSupportedNavigatorShare = true;
    try {
      // not add title and description to load metadata from url
      await navigator.share({ url: window.location.href });
      userLog("info", "Room Shared successfully!");
    } catch (error) {
      errorNavigatorShare = true;
      /*  This feature is available only in secure contexts (HTTPS),
          in some or all supporting browsers and mobile devices
          console.error("navigator.share", error); 
      */
    }
  }

  // something wrong or not supported navigator.share
  if (
    !isSupportedNavigatorShare ||
    (isSupportedNavigatorShare && errorNavigatorShare)
  ) {
    playSound("newMessage");

    Swal.fire({
      allowOutsideClick: false,
      background: swalBackground,
      position: "center",
      title: "Share Room",
      imageAlt: "mirotalk-share",
      imageUrl: shareUrlImg,
      html:
        `
      <br/>
      Send this URL to all participants
      <p style="color:rgb(8, 189, 89);">` +
        window.location.href +
        `</p>`,
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp",
      },
      confirmButtonText: `Copy URL`,
    });
  }
}

/**
 * Copy Room URL to clipboard
 */
function copyRoomURL() {
  // save Room Url to clipboard
  var roomURL = window.location.href;
  var tmpInput = document.createElement("input");
  document.body.appendChild(tmpInput);
  tmpInput.value = roomURL;
  tmpInput.select();
  // for mobile devices
  tmpInput.setSelectionRange(0, 99999);
  document.execCommand("copy");
  console.log("Copied to clipboard Join Link ", roomURL);
  document.body.removeChild(tmpInput);
}

/**
 * SwapCamer front (user) - rear (environment)
 */
function swapCamera() {
  // setup camera
  camera = camera == "user" ? "environment" : "user";
  if (camera == "user") useVideo = true;
  else useVideo = { facingMode: { exact: camera } };

  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  navigator.mediaDevices
    .getUserMedia({ audio: useAudio, video: useVideo })
    .then((camStream) => {
      refreshMyStreamToPeers(camStream);
      refreshMyLocalStream(camStream);
      if (useVideo) setMyVideoStatusTrue();
      myVideo.classList.toggle("mirror");
    })
    .catch((e) => {
      console.log("[Error] to swaping camera", e);
      userLog("error", "Error to swaping the camera");
    });
}

/**
 * Enable - disable screen sharing
 */
function toggleScreenSharing() {
  const constraints = {
    video: true,
  };

  let screenMediaPromise;

  if (!isScreenStreaming) {
    // on screen sharing start
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
    // on screen sharing stop
    const audioSource = audioInputSelect.value;
    const videoSource = videoSelect.value;
    const constraints = {
      audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
      video: { deviceId: videoSource ? { exact: videoSource } : undefined },
    };
    screenMediaPromise = navigator.mediaDevices.getUserMedia(constraints);
    videoBtn.className = "fas fa-video";
    // if screen sharing accidentally closed
    if (isStreamRecording) {
      stopStreamRecording();
    }
  }
  screenMediaPromise
    .then((screenStream) => {
      isScreenStreaming = !isScreenStreaming;
      refreshMyStreamToPeers(screenStream);
      refreshMyLocalStream(screenStream);
      myVideo.classList.toggle("mirror");
      screenShareBtn.className = isScreenStreaming
        ? "fas fa-stop-circle"
        : "fas fa-desktop";
      setMyVideoStatusTrue();
    })
    .catch((e) => {
      console.error("[Error] Unable to share the screen", e);
      userLog("error", "Unable to share the screen");
    });
}

/**
 * set myVideoStatus true
 */
function setMyVideoStatusTrue() {
  // Put video status alredy ON
  if (myVideoStatus === false) {
    myVideoStatus = true;
    videoBtn.className = "fas fa-video";
    myVideoStatusIcon.className = "fas fa-video videoStatusIcon";
    emitVAStatus("video", myVideoStatus);
  }
}

/**
 * Enter - esc on full screen mode
 * https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
 */
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    fullScreenBtn.className = "fas fa-compress-alt";
    isDocumentOnFullScreen = true;
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      fullScreenBtn.className = "fas fa-expand-alt";
      isDocumentOnFullScreen = false;
    }
  }
}

/**
 * Refresh my stream changes to connected peers in the room
 * @param {*} stream
 */
function refreshMyStreamToPeers(stream) {
  if (thereIsPeerConnections()) {
    // refresh my video stream
    for (var peer_id in peerConnections) {
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders
      var sender = peerConnections[peer_id]
        .getSenders()
        .find((s) => (s.track ? s.track.kind === "video" : false));
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack
      sender.replaceTrack(stream.getVideoTracks()[0]);
    }
  }
}

/**
 * Refresh my local stream
 * @param {*} stream
 */
function refreshMyLocalStream(stream) {
  stopWindowsStream();

  // need for recording stream later
  window.stream = stream;

  stream.getVideoTracks()[0].enabled = true;
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
  const newStream = new MediaStream([
    stream.getVideoTracks()[0],
    localMediaStream.getAudioTracks()[0],
  ]);
  localMediaStream = newStream;
  // attachMediaStream is a part of the adapter.js library
  attachMediaStream(myVideo, localMediaStream); // newstream

  // on toggleScreenSharing video stop
  stream.getVideoTracks()[0].onended = function () {
    if (isScreenStreaming) toggleScreenSharing();
  };
}

/**
 * Stop windows.stream
 */
function stopWindowsStream() {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

/**
 * recordind stream data
 * @param {*} event
 */
function handleDataAvailable(event) {
  console.log("handleDataAvailable", event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

/**
 * Start Recording
 * https://github.com/webrtc/samples/tree/gh-pages/src/content/getusermedia/record
 */
function startStreamRecording() {
  recordedBlobs = [];
  let options = { mimeType: "video/webm;codecs=vp9,opus" };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    console.error(`${options.mimeType} is not supported`);
    options = { mimeType: "video/webm;codecs=vp8,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error(`${options.mimeType} is not supported`);
      options = { mimeType: "video/webm" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not supported`);
        options = { mimeType: "" };
      }
    }
  }

  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e) {
    console.error("Exception while creating MediaRecorder:", e);
    userLog("error", "Can't start stream recording :(");
    return;
  }

  console.log("Created MediaRecorder", mediaRecorder, "with options", options);
  mediaRecorder.onstop = (event) => {
    console.log("MediaRecorder stopped: ", event);
    console.log("MediaRecorder Blobs: ", recordedBlobs);
    myVideoParagraph.innerHTML = myPeerName;
    disableElements(false);
    downloadRecordedStream();
  };

  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log("MediaRecorder started", mediaRecorder);
  isStreamRecording = true;
  recordStreamBtn.style.setProperty("background-color", "red");
  startRecordingTime();
  disableElements(true);
}

/**
 * Stop recording
 */
function stopStreamRecording() {
  mediaRecorder.stop();
  isStreamRecording = false;
  recordStreamBtn.style.setProperty("background-color", "white");
}

/**
 * Download recorded stream
 */
function downloadRecordedStream() {
  const recFileName = getDataTimeString() + "-REC.webm";
  userLog(
    "success",
    `Recording file name: ${recFileName}, please wait to be processed, then will be downloaded to your PC.`
  );
  const blob = new Blob(recordedBlobs, { type: "video/webm" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = recFileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Data Formated DD-MM-YYYY-H_M_S
 * https://convertio.co/it/
 * @returns data string
 */
function getDataTimeString() {
  const d = new Date();
  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().split(" ")[0];
  return `${date}-${time}`;
}

/**
 * Disable - enable some elements on Recording
 * I can Record One Media Stream at time
 * @param {*} b boolean true/false
 */
function disableElements(b) {
  swapCameraBtn.disabled = b;
  screenShareBtn.disabled = b;
  audioSource.disabled = b;
  videoSource.disabled = b;
}

/**
 * Set the chat room on full screen mode for mobile
 */
function setChatRoomForMobile() {
  if (isMobileDevice) {
    document.documentElement.style.setProperty("--msger-height", "98%");
    document.documentElement.style.setProperty("--msger-width", "98%");
  } else {
    // make chat room draggable for desktop
    dragElement(msgerDraggable, msgerHeader);
  }
}

/**
 * Show msger draggable on center screen position
 */
function showChatRoomDraggable() {
  playSound("newMessage");
  if (isMobileDevice) {
    leftButtons.style.display = "none";
    isButtonsVisible = false;
  }
  chatRoomBtn.className = "fas fa-comment-slash";
  msgerDraggable.style.top = "50%";
  msgerDraggable.style.left = "50%";
  msgerDraggable.style.display = "flex";
  checkCountTime();
  isChatRoomVisible = true;
}

/**
 * Clean chat messages
 * https://sweetalert2.github.io
 */
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
    // clean chat messages
    if (result.isConfirmed) {
      var msgs = msgerChat.firstChild;
      while (msgs) {
        msgerChat.removeChild(msgs);
        msgs = msgerChat.firstChild;
      }
      // clean object
      chatMessages = [];
    }
  });
}

/**
 * Hide chat room and emoji picker
 */
function hideChatRoomAndEmojiPicker() {
  msgerDraggable.style.display = "none";
  msgerEmojiPicker.style.display = "none";
  chatRoomBtn.className = "fas fa-comment";
  isChatRoomVisible = false;
  isChatEmojiVisible = false;
}

/**
 * Hide - show count time
 */
function checkCountTime() {
  if (isMobileDevice) {
    if (countTime.style.display == "none") {
      countTime.style.display = "inline";
      return;
    }
    countTime.style.display = "none";
  }
}

/**
 * Escape Special Chars
 * @param {*} regex
 */
function escapeSpecialChars(regex) {
  return regex.replace(/([()[{*+.$^\\|?])/g, "\\$1");
}

/**
 * Append Message to msger chat room
 * @param {*} name
 * @param {*} img
 * @param {*} side
 * @param {*} text
 */
function appendMessage(name, img, side, text) {
  let time = getFormatDate(new Date());
  // collect chat msges to save it later
  chatMessages.push({
    time: time,
    name: name,
    text: text,
  });
  // console.log("chatMessages", chatMessages);
  let ctext = detectUrl(text);
  const msgHTML = `
	<div class="msg ${side}-msg">
		<div class="msg-img" style="background-image: url(${img})"></div>
		<div class="msg-bubble">
		<div class="msg-info">
			<div class="msg-info-name">${name}</div>
			<div class="msg-info-time">${time}</div>
		</div>
		<div class="msg-text">${ctext}</div>
		</div>
	</div>
  `;
  msgerChat.insertAdjacentHTML("beforeend", msgHTML);
  msgerChat.scrollTop += 500;
}

/**
 * Detect url from text and make it clickable
 * Detect also if url is a img to create preview of it
 * @param {*} text
 * @returns html
 */
function detectUrl(text) {
  var urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, function (url) {
    if (isImageURL(text)) {
      return (
        '<p><img src="' + url + '" alt="img" width="200" height="auto"/></p>'
      );
    }
    return (
      '<a id="chat-msg-a" href="' + url + '" target="_blank">' + url + "</a>"
    );
  });
}

/**
 * Check if url passed is a image
 * @param {*} url
 * @returns true/false
 */
function isImageURL(url) {
  return url.match(/\.(jpeg|jpg|gif|png)$/) != null;
}

/**
 * Format data h:m:s
 * @param {*} date
 */
function getFormatDate(date) {
  const time = date.toTimeString().split(" ")[0];
  return `${time}`;
}

/**
 * Send message over signaling server
 * @param {*} name
 * @param {*} msg
 */
function emitMsg(name, msg) {
  if (msg) {
    signalingSocket.emit("msg", {
      peerConnections: peerConnections,
      room_id: roomId,
      name: name,
      msg: msg,
    });
    console.log("Send msg", {
      room_id: roomId,
      name: name,
      msg: msg,
    });
  }
}

/**
 * Hide - Show emoji picker div
 */
function hideShowEmojiPicker() {
  if (!isChatEmojiVisible) {
    playSound("newMessage");
    msgerEmojiPicker.style.display = "block";
    isChatEmojiVisible = true;
    return;
  }
  msgerEmojiPicker.style.display = "none";
  isChatEmojiVisible = false;
}

/**
 * Download Chat messages in json format
 * https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
 */
function downloadChatMsgs() {
  var a = document.createElement("a");
  a.href =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(chatMessages, null, 1));
  a.download = getDataTimeString() + "-CHAT.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Make chat room - devices draggable
 * https://www.w3schools.com/howto/howto_js_draggable.asp
 * @param {*} elmnt
 * @param {*} dragObj
 */
function dragElement(elmnt, dragObj) {
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

/**
 * Hide - show my settings
 */
function hideShowMySettings() {
  if (!isMySettingsVisible) {
    playSound("newMessage");
    // my current peer name
    myPeerNameSet.placeholder = myPeerName;
    // center screen on show
    mySettings.style.top = "50%";
    mySettings.style.left = "50%";
    mySettings.style.display = "block";
    isMySettingsVisible = true;
    return;
  }
  mySettings.style.display = "none";
  isMySettingsVisible = false;
}

/**
 * Update myPeerName to other peers in the room
 */
function updateMyPeerName() {
  var myNewPeerName = myPeerNameSet.value;
  var myOldPeerName = myPeerName;

  // myNewPeerName empty
  if (!myNewPeerName) return;

  myPeerName = myNewPeerName;
  myVideoParagraph.innerHTML = myPeerName;

  signalingSocket.emit("cName", {
    peerConnections: peerConnections,
    room_id: roomId,
    peer_name_old: myOldPeerName,
    peer_name_new: myPeerName,
  });

  myPeerNameSet.value = "";
  myPeerNameSet.placeholder = myPeerName;
}

/**
 * Append updated peer name to video player
 * @param {*} id
 * @param {*} name
 */
function appendPeerName(id, name) {
  var videoName = getId(id + "_name");
  if (videoName) {
    videoName.innerHTML = name;
  }
}

/**
 * Send my Video-Audio status
 * @param {*} element
 * @param {*} status
 */
function emitVAStatus(element, status) {
  signalingSocket.emit("vaStatus", {
    peerConnections: peerConnections,
    room_id: roomId,
    peer_name: myPeerName,
    element: element,
    status: status,
  });
}

/**
 * About info
 * https://sweetalert2.github.io
 */
function getAbout() {
  playSound("newMessage");

  Swal.fire({
    background: swalBackground,
    position: "center",
    title: "<strong>WebRTC Made with ❤️</strong>",
    imageAlt: "mirotalk-about",
    imageUrl: aboutImg,
    html: `
    <br/>
    <div id="about"><b>open source</b> project on<a href="https://github.com/miroslavpejic85/mirotalk" target="_blank"><h1><strong> GitHub </strong></h1></a></div>
    <div id="author"><a href="https://www.linkedin.com/in/miroslav-pejic-976a07101/" target="_blank">Author: Miroslav Pejic</a></div>
    `,
    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  });
}

/**
 * Leave the Room and create a new one
 * https://sweetalert2.github.io
 */
function leaveRoom() {
  playSound("newMessage");

  Swal.fire({
    background: swalBackground,
    position: "center",
    imageAlt: "mirotalk-leave",
    imageUrl: leaveRoomImg,
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
    if (result.isConfirmed) {
      window.location.href = "/newcall";
    }
  });
}

/**
 * Basic user logging
 * https://sweetalert2.github.io
 * @param {*} type
 * @param {*} message
 */
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
    case "success":
      Swal.fire({
        background: swalBackground,
        position: "center",
        icon: "success",
        title: "Success",
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

/**
 * Sound notifications
 * https://notificationsounds.com/notification-sounds
 * @param {*} state
 */
async function playSound(state) {
  if (!notifyBySound) return;

  let file_audio = "";
  switch (state) {
    case "addPeer":
      file_audio = notifyAddPeer;
      break;
    case "removePeer":
      file_audio = notifyRemovePeer;
      break;
    case "newMessage":
      file_audio = notifyNewMessage;
      break;
    case "recStart":
      file_audio = notifyRecStart;
      break;
    case "recStop":
      file_audio = notifyRecStop;
      break;
    case "error":
      file_audio = notifyError;
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

/**
 * Get Html element by Id
 * @param {*} id
 */
function getId(id) {
  return document.getElementById(id);
}

/**
 * Get Html element by selector
 * @param {*} selector
 */
function getSl(selector) {
  return document.querySelector(selector);
}
