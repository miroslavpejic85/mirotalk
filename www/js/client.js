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
const aboutImg = "../images/about.png";
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
var swalBackground = "rgba(0, 0, 0, 0.7)"; // black - #16171b - transparent ...
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
var recordStreamBtn;
var fullScreenBtn;
var chatRoomBtn;
var mySettingsBtn;
var aboutBtn;
var leaveRoomBtn;
// chat room elements
var msgerDraggable;
var msgerHeader;
var msgerTheme;
var msgerCPBtn;
var msgerClean;
var msgerSaveBtn;
var msgerClose;
var msgerChat;
var whiteboardBtn;
var msgerEmojiBtn;
var msgerInput;
var msgerSendBtn;
// chat room connected peers
var msgerCP;
var msgerCPHeader;
var msgerCPCloseBtn;
var msgerCPList;
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
var mediaRecorder;
var recordedBlobs;
var isStreamRecording = false;
// whiteboard init
var whiteboardCont;
var whiteboardCloseBtn;
var whiteboardCleanBtn;
var whiteboardEraserBtn;
var isWhiteboardVisible = false;
var canvas;
var ctx;
// whiteboard settings
var isDrawing = 0;
var x = 0;
var y = 0;
var color = "black";
var drawsize = 3;

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
  recordStreamBtn = getId("recordStreamBtn");
  fullScreenBtn = getId("fullScreenBtn");
  chatRoomBtn = getId("chatRoomBtn");
  whiteboardBtn = getId("whiteboardBtn");
  mySettingsBtn = getId("mySettingsBtn");
  aboutBtn = getId("aboutBtn");
  leaveRoomBtn = getId("leaveRoomBtn");
  // chat Room elements
  msgerDraggable = getId("msgerDraggable");
  msgerHeader = getId("msgerHeader");
  msgerTheme = getId("msgerTheme");
  msgerCPBtn = getId("msgerCPBtn");
  msgerClean = getId("msgerClean");
  msgerSaveBtn = getId("msgerSaveBtn");
  msgerClose = getId("msgerClose");
  msgerChat = getId("msgerChat");
  msgerEmojiBtn = getId("msgerEmojiBtn");
  msgerInput = getId("msgerInput");
  msgerSendBtn = getId("msgerSendBtn");
  // chat room connected peers
  msgerCP = getId("msgerCP");
  msgerCPHeader = getId("msgerCPHeader");
  msgerCPCloseBtn = getId("msgerCPCloseBtn");
  msgerCPList = getId("msgerCPList");
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
  // my whiteboard
  whiteboardCont = getSl(".whiteboard-cont");
  whiteboardCloseBtn = getId("whiteboardCloseBtn");
  whiteboardEraserBtn = getId("whiteboardEraserBtn");
  whiteboardCleanBtn = getId("whiteboardCleanBtn");
  canvas = getId("whiteboard");
  ctx = canvas.getContext("2d");
}

/**
 * Using tippy aka very nice tooltip!
 * https://atomiks.github.io/tippyjs/
 */
function setButtonsTitle() {
  // not need for mobile
  if (isMobileDevice) return;

  // left buttons
  tippy(shareRoomBtn, {
    content: "Invite people to join",
    placement: "right-start",
  });
  tippy(audioBtn, {
    content: "Click to audio OFF",
    placement: "right-start",
  });
  tippy(videoBtn, {
    content: "Click to video OFF",
    placement: "right-start",
  });
  tippy(screenShareBtn, {
    content: "START screen sharing",
    placement: "right-start",
  });
  tippy(recordStreamBtn, {
    content: "START recording",
    placement: "right-start",
  });
  tippy(fullScreenBtn, {
    content: "VIEW full screen",
    placement: "right-start",
  });
  tippy(chatRoomBtn, {
    content: "OPEN the chat",
    placement: "right-start",
  });
  tippy(whiteboardBtn, {
    content: "OPEN the whiteboard",
    placement: "right-start",
  });
  tippy(mySettingsBtn, {
    content: "Show settings",
    placement: "right-start",
  });
  tippy(aboutBtn, {
    content: "Show about",
    placement: "right-start",
  });
  tippy(leaveRoomBtn, {
    content: "Leave this room",
    placement: "right-start",
  });

  // chat room buttons
  tippy(msgerTheme, {
    content: "Ghost theme",
  });
  tippy(msgerCPBtn, {
    content: "All Participants",
  });
  tippy(msgerClean, {
    content: "Clean messages",
  });
  tippy(msgerSaveBtn, {
    content: "Save messages",
  });
  tippy(msgerClose, {
    content: "Close the chat",
  });
  tippy(msgerEmojiBtn, {
    content: "Emoji",
  });
  tippy(msgerSendBtn, {
    content: "Send",
  });

  // emoji picker
  tippy(msgerCloseEmojiBtn, {
    content: "Close emoji",
  });

  // settings
  tippy(mySettingsCloseBtn, {
    content: "Close settings",
  });
  tippy(myPeerNameSetBtn, {
    content: "Change name",
  });

  // whiteboard btns
  tippy(whiteboardCloseBtn, {
    content: "CLOSE the whiteboard",
    placement: "right-start",
  });
  tippy(whiteboardEraserBtn, {
    content: "ERAISE the board",
    placement: "right-start",
  });
  tippy(whiteboardCleanBtn, {
    content: "CLEAN the board",
    placement: "right-start",
  });
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

    // add peer to msger lists 4 private msgs
    msgerAddPeers(peers);

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
        tippy(remoteVideoParagraph, {
          content: "Participant name",
        });
        const peerVideoText = document.createTextNode(
          peers[peer_id]["peer_name"]
        );
        remoteVideoParagraph.appendChild(peerVideoText);
        // remote video status element
        remoteVideoStatusIcon.setAttribute("id", peer_id + "_videoStatus");
        remoteVideoStatusIcon.className = "fas fa-video videoStatusIcon";
        tippy(remoteVideoStatusIcon, {
          content: "Participant video is ON",
        });
        // remote audio status element
        remoteAudioStatusIcon.setAttribute("id", peer_id + "_audioStatus");
        remoteAudioStatusIcon.className = "fas fa-microphone audioStatusIcon";
        tippy(remoteAudioStatusIcon, {
          content: "Participant audio is ON",
        });

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

        // refresh remote peers video icon status and title
        setPeerVideoStatus(peer_id, peers[peer_id]["peer_video"]);
        // refresh remote peers audio icon status and title
        setPeerAudioStatus(peer_id, peers[peer_id]["peer_audio"]);
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
              userLog(
                "error",
                "Offer setLocalDescription failed: " + e.message
              );
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
                  userLog(
                    "error",
                    "Answer setLocalDescription failed: " + e.message
                  );
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

    msgerRemovePeer(peer_id);

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
    appendMessage(
      config.name,
      friendChatAvatar,
      "left",
      config.msg,
      config.privateMsg
    );
  });

  // refresh peers name
  signalingSocket.on("onCName", function (config) {
    appendPeerName(config.peer_id, config.peer_name);
  });

  // refresh peers video - audio icon status and title
  signalingSocket.on("onVAStatus", function (config) {
    var peer_id = config.peer_id;
    var element = config.element;
    var status = config.status;

    switch (element) {
      case "video":
        setPeerVideoStatus(peer_id, status);
        break;
      case "audio":
        setPeerAudioStatus(peer_id, status);
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
      document.documentElement.style.setProperty("--msger-private-bg", "black");
      document.documentElement.style.setProperty("--left-msg-bg", "#da05f3");
      document.documentElement.style.setProperty("--private-msg-bg", "#f77070");
      document.documentElement.style.setProperty("--right-msg-bg", "#579ffb");
      document.documentElement.style.setProperty("--btn-bg", "white");
      document.documentElement.style.setProperty("--btn-color", "black");
      document.documentElement.style.setProperty("--btn-opc", "1");
      document.documentElement.style.setProperty("--btns-left", "20px");
      document.documentElement.style.setProperty(
        "--box-shadow",
        "3px 3px 6px #0500ff, -3px -3px 6px #da05f3"
      );
      break;
    case "dark":
      // dark theme
      swalBackground = "rgba(0, 0, 0, 0.7)";
      document.documentElement.style.setProperty("--body-bg", "#16171b");
      document.documentElement.style.setProperty("--msger-bg", "#16171b");
      document.documentElement.style.setProperty(
        "--msger-private-bg",
        "#16171b"
      );
      document.documentElement.style.setProperty("--left-msg-bg", "#222328");
      document.documentElement.style.setProperty("--private-msg-bg", "#f77070");
      document.documentElement.style.setProperty("--right-msg-bg", "#0a0b0c");
      document.documentElement.style.setProperty("--btn-bg", "white");
      document.documentElement.style.setProperty("--btn-color", "black");
      document.documentElement.style.setProperty("--btn-opc", "1");
      document.documentElement.style.setProperty("--btns-left", "20px");
      document.documentElement.style.setProperty(
        "--box-shadow",
        "3px 3px 6px #0a0b0c, -3px -3px 6px #222328"
      );
      break;
    case "ghost":
      // ghost theme
      swalBackground = "rgba(0, 0, 0, 0.150)";
      document.documentElement.style.setProperty("--body-bg", "black");
      document.documentElement.style.setProperty("--msger-bg", "transparent");
      document.documentElement.style.setProperty("--msger-private-bg", "black");
      document.documentElement.style.setProperty("--btn-bg", "transparent");
      document.documentElement.style.setProperty("--btn-color", "white");
      document.documentElement.style.setProperty("--btn-opc", "0.7");
      document.documentElement.style.setProperty("--btns-left", "20px");
      document.documentElement.style.setProperty("--box-shadow", "0px");
      document.documentElement.style.setProperty(
        "--left-msg-bg",
        "rgba(0, 0, 0, 0.7)"
      );
      document.documentElement.style.setProperty(
        "--private-msg-bg",
        "rgba(252, 110, 110, 0.7)"
      );
      document.documentElement.style.setProperty(
        "--right-msg-bg",
        "rgba(0, 0, 0, 0.7)"
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

      localMediaStream = stream;

      const videoWrap = document.createElement("div");
      // handle my peer name video audio status
      const myVideoParagraph = document.createElement("h4");
      const myVideoStatusIcon = document.createElement("button");
      const myAudioStatusIcon = document.createElement("button");

      // my peer name
      myVideoParagraph.setAttribute("id", "myVideoParagraph");
      myVideoParagraph.className = "videoPeerName";
      tippy(myVideoParagraph, {
        content: "My name",
      });
      // my video status element
      myVideoStatusIcon.setAttribute("id", "myVideoStatusIcon");
      myVideoStatusIcon.className = "fas fa-video videoStatusIcon";
      tippy(myVideoStatusIcon, {
        content: "My video is ON",
      });
      // my audio status element
      myAudioStatusIcon.setAttribute("id", "myAudioStatusIcon");
      myAudioStatusIcon.className = "fas fa-microphone audioStatusIcon";
      tippy(myAudioStatusIcon, {
        content: "My audio is ON",
      });

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
      setButtonsTitle();
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
      // https://blog.addpipe.com/common-getusermedia-errors/
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
  setMyWhiteboardBtn();
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
    myAudioStatus = localMediaStream.getAudioTracks()[0].enabled;
    setMyAudioStatus(myAudioStatus);
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
    myVideoStatus = localMediaStream.getVideoTracks()[0].enabled;
    setMyVideoStatus(myVideoStatus);
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
        // only for desktop
        if (!isMobileDevice) {
          tippy(fullScreenBtn, {
            content: "VIEW full screen",
            placement: "right-start",
          });
        }
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
      document.documentElement.style.setProperty("--msger-private-bg", "black");
    } else {
      e.target.className = "fas fa-ghost";
      mirotalkTheme == "dark"
        ? document.documentElement.style.setProperty("--msger-bg", "#16171b")
        : document.documentElement.style.setProperty("--msger-bg", "black");
    }
  });

  // show msger participants section
  msgerCPBtn.addEventListener("click", (e) => {
    if (!thereIsPeerConnections()) {
      userLog("info", "No participants detected");
      return;
    }
    msgerCP.style.display = "flex";
  });

  // hide msger participants section
  msgerCPCloseBtn.addEventListener("click", (e) => {
    msgerCP.style.display = "none";
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

  // Execute a function when the user releases a key on the keyboard
  msgerInput.addEventListener("keyup", function (e) {
    // Number 13 is the "Enter" key on the keyboard
    if (e.keyCode === 13) {
      e.preventDefault();
      msgerSendBtn.click();
    }
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

    emitMsg(myPeerName, msg, false, "");
    appendMessage(myPeerName, myChatAvatar, "right", msg, false);
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
 * Whiteboard
 * https://r8.whiteboardfox.com (good alternative)
 */
function setMyWhiteboardBtn() {
  // not supported for mobile
  if (isMobileDevice) {
    whiteboardBtn.style.display = "none";
    return;
  }

  setupCanvas();

  whiteboardBtn.addEventListener("click", (e) => {
    //hideWhiteboard();
    if (isWhiteboardVisible) {
      whiteboardCont.style.display = "none";
      isWhiteboardVisible = false;
    } else {
      whiteboardCont.style.display = "block";
      isWhiteboardVisible = true;
    }
    fitToContainer(canvas);
  });

  // close whiteboard
  whiteboardCloseBtn.addEventListener("click", (e) => {
    whiteboardCont.style.display = "none";
    isWhiteboardVisible = false;
  });
  // erase whiteboard
  whiteboardEraserBtn.addEventListener("click", (e) => {
    setEraser();
  });
  // clean whiteboard
  whiteboardCleanBtn.addEventListener("click", (e) => {
    cleanBoard();
  });
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
    setRecordButtonUi();
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
  userLog("error", "Something wrong: " + error.message);
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
      title: "Share the Room",
      imageAlt: "mirotalk-share",
      imageUrl: shareUrlImg,
      html:
        `
      <br/>
      <div id="qrRoomContainer">
        <canvas id="qrRoom"></canvas>
      </div>
      <br/><br/>
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
    makeRoomQR();
  }
}

/**
 * Make Room QR
 * https://github.com/neocotic/qrious
 */
function makeRoomQR() {
  var qr = new QRious({
    element: getId("qrRoom"),
    value: window.location.href,
  });
  qr.set({
    size: 128,
  });
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
      userLog("error", "Error to swaping the camera: " + e.message);
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
      setScreenSharingStatus(isScreenStreaming);
      setMyVideoStatusTrue();
    })
    .catch((e) => {
      console.error("[Error] Unable to share the screen", e);
      userLog("error", "Unable to share the screen: " + e.message);
    });
}

/**
 * Set Screen Sharing Status
 * @param {*} status
 */
function setScreenSharingStatus(status) {
  screenShareBtn.className = status ? "fas fa-stop-circle" : "fas fa-desktop";
  // only for desktop
  if (!isMobileDevice) {
    tippy(screenShareBtn, {
      content: status ? "STOP screen sharing" : "START screen sharing",
      placement: "right-start",
    });
  }
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
    // only for desktop
    if (!isMobileDevice) {
      tippy(videoBtn, {
        content: "Click to video OFF",
        placement: "right-start",
      });
    }
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
  // only for desktop
  if (!isMobileDevice) {
    tippy(fullScreenBtn, {
      content: isDocumentOnFullScreen ? "EXIT full screen" : "VIEW full screen",
      placement: "right-start",
    });
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
    // record only my local Media Stream
    mediaRecorder = new MediaRecorder(localMediaStream, options);
  } catch (e) {
    console.error("Exception while creating MediaRecorder:", e);
    userLog("error", "Can't start stream recording: " + e.message);
    return;
  }

  console.log("Created MediaRecorder", mediaRecorder, "with options", options);
  mediaRecorder.onstop = (event) => {
    console.log("MediaRecorder stopped: ", event);
    console.log("MediaRecorder Blobs: ", recordedBlobs);
    myVideoParagraph.innerHTML = myPeerName;
    disableElements(false);
    downloadRecordedStream();
    // only for desktop
    if (!isMobileDevice) {
      tippy(recordStreamBtn, {
        content: "START recording",
        placement: "right-start",
      });
    }
  };

  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log("MediaRecorder started", mediaRecorder);
  isStreamRecording = true;
  recordStreamBtn.style.setProperty("background-color", "red");
  startRecordingTime();
  disableElements(true);
  // only for desktop
  if (!isMobileDevice) {
    tippy(recordStreamBtn, {
      content: "STOP recording",
      placement: "right-start",
    });
  }
}

/**
 * Stop recording
 */
function stopStreamRecording() {
  mediaRecorder.stop();
  isStreamRecording = false;
  setRecordButtonUi();
}

/**
 * Set Record Button UI on change theme
 */
function setRecordButtonUi() {
  if (mirotalkTheme == "ghost") {
    recordStreamBtn.style.setProperty("background-color", "transparent");
  } else {
    recordStreamBtn.style.setProperty("background-color", "white");
  }
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
    document.documentElement.style.setProperty("--msger-height", "99%");
    document.documentElement.style.setProperty("--msger-width", "99%");
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
  // only for desktop
  if (!isMobileDevice) {
    tippy(chatRoomBtn, {
      content: "CLOSE the chat",
      placement: "right-start",
    });
  }
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
  // only for desktop
  if (!isMobileDevice) {
    tippy(chatRoomBtn, {
      content: "OPEN the chat",
      placement: "right-start",
    });
  }
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
 * @param {*} privateMsg
 */
function appendMessage(name, img, side, text, privateMsg) {
  let time = getFormatDate(new Date());
  // collect chat msges to save it later
  chatMessages.push({
    time: time,
    name: name,
    text: text,
    private_msg: privateMsg,
  });

  // check if i receive a private message
  let msgBubble = privateMsg ? "private-msg-bubble" : "msg-bubble";

  // console.log("chatMessages", chatMessages);
  let ctext = detectUrl(text);
  const msgHTML = `
	<div class="msg ${side}-msg">
		<div class="msg-img" style="background-image: url(${img})"></div>
		<div class=${msgBubble}>
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
 * Add participants in the chat room lists
 * @param {*} peers
 */
function msgerAddPeers(peers) {
  // console.log("peers", peers);
  // add all current Participants
  for (var peer_id in peers) {
    var peer_name = peers[peer_id]["peer_name"];
    // bypass insert to myself in the list :)
    if (peer_name != myPeerName) {
      var exsistMsgerPrivateDiv = getId(peer_id + "_pMsgDiv");
      // if there isn't add it....
      if (!exsistMsgerPrivateDiv) {
        var msgerPrivateDiv = `
        <div id="${peer_id}_pMsgDiv" class="msger-inputarea">
          <input
            id="${peer_id}_pMsgInput"
            class="msger-input"
            type="text"
            placeholder="Enter your message..."
          />
          <button id="${peer_id}_pMsgBtn" class="fas fa-paper-plane" value="${peer_name}">&nbsp;${peer_name}</button>
        </div>
        `;
        msgerCPList.insertAdjacentHTML("beforeend", msgerPrivateDiv);
        msgerCPList.scrollTop += 500;

        var msgerPrivateMsgInput = getId(peer_id + "_pMsgInput");
        var msgerPrivateBtn = getId(peer_id + "_pMsgBtn");
        addMsgerPrivateBtn(msgerPrivateBtn, msgerPrivateMsgInput, peer_id);
      }
    }
  }
}

/**
 * Remove participant from chat room lists
 * @param {*} peer_id
 */
function msgerRemovePeer(peer_id) {
  var msgerPrivateDiv = getId(peer_id + "_pMsgDiv");
  var peerToRemove = msgerPrivateDiv.firstChild;
  while (peerToRemove) {
    msgerPrivateDiv.removeChild(peerToRemove);
    peerToRemove = msgerPrivateDiv.firstChild;
  }
  msgerPrivateDiv.remove();
}

/**
 * Setup msger buttons to send private messages
 * @param {*} msgerPrivateBtn
 * @param {*} msgerPrivateMsgInput
 * @param {*} peer_id
 */
function addMsgerPrivateBtn(msgerPrivateBtn, msgerPrivateMsgInput, peer_id) {
  // add button to send private messages
  msgerPrivateBtn.addEventListener("click", (e) => {
    e.preventDefault();
    var pMsg = msgerPrivateMsgInput.value;
    if (!pMsg) return;
    var peer_name = msgerPrivateBtn.value;
    // userLog("info", peer_name + ":" + peer_id);
    emitMsg(myPeerName, pMsg, true, peer_id);
    appendMessage(
      myPeerName,
      myChatAvatar,
      "right",
      pMsg + "<br/>Private message to " + peer_name,
      true
    );
    msgerPrivateMsgInput.value = "";
    msgerCP.style.display = "none";
  });
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
 * @param {*} privateMsg private message true/false
 * @param {*} peer_id to sent private message
 */
function emitMsg(name, msg, privateMsg, peer_id) {
  if (msg) {
    signalingSocket.emit("msg", {
      peerConnections: peerConnections,
      room_id: roomId,
      privateMsg: privateMsg,
      peer_id: peer_id,
      name: name,
      msg: msg,
    });
    console.log("Send msg", {
      room_id: roomId,
      privateMsg: privateMsg,
      peer_id: peer_id,
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
  // change also btn value - name on chat lists....
  var msgerPeerName = getId(id + "_pMsgBtn");
  if (msgerPeerName) {
    msgerPeerName.innerHTML = `&nbsp;${name}`;
    msgerPeerName.value = name;
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
 * Set My Audio Status Icon and Title
 * @param {*} status
 */
function setMyAudioStatus(status) {
  myAudioStatusIcon.className =
    "fas fa-microphone" + (status ? "" : "-slash") + " audioStatusIcon";
  // send my audio status to all peers in the room
  emitVAStatus("audio", status);
  tippy(myAudioStatusIcon, {
    content: status ? "My audio is ON" : "My audio is OFF",
  });
  // only for desktop
  if (!isMobileDevice) {
    tippy(audioBtn, {
      content: status ? "Click to audio OFF" : "Click to audio ON",
      placement: "right-start",
    });
  }
}

/**
 * Set My Video Status Icon and Title
 * https://atomiks.github.io/tippyjs/
 * @param {*} status
 */
function setMyVideoStatus(status) {
  myVideoStatusIcon.className =
    "fas fa-video" + (status ? "" : "-slash") + " videoStatusIcon";
  // send my video status to all peers in the room
  emitVAStatus("video", status);
  tippy(myVideoStatusIcon, {
    content: status ? "My video is ON" : "My video is OFF",
  });
  // only for desktop
  if (!isMobileDevice) {
    tippy(videoBtn, {
      content: status ? "Click to video OFF" : "Click to video ON",
      placement: "right-start",
    });
  }
}

/**
 * Set Participant Audio Status Icon and Title
 * https://atomiks.github.io/tippyjs/
 * @param {*} peer_id
 * @param {*} status
 */
function setPeerAudioStatus(peer_id, status) {
  let peerAudioStatus = getId(peer_id + "_audioStatus");
  peerAudioStatus.className =
    "fas fa-microphone" + (status ? "" : "-slash") + " audioStatusIcon";
  tippy(peerAudioStatus, {
    content: status ? "Participant audio is ON" : "Participant audio is OFF",
  });
}

/**
 * Set Participant Video Status Icon and Title
 * https://atomiks.github.io/tippyjs/
 * @param {*} peer_id
 * @param {*} status
 */
function setPeerVideoStatus(peer_id, status) {
  let peerVideoStatus = getId(peer_id + "_videoStatus");
  peerVideoStatus.className =
    "fas fa-video" + (status ? "" : "-slash") + " videoStatusIcon";
  tippy(peerVideoStatus, {
    content: status ? "Participant video is ON" : "Participant video is OFF",
  });
}

/**
 * Set whiteboard color
 * @param {*} newcolor
 */
function setColor(newcolor) {
  color = newcolor;
  drawsize = 3;
}

/**
 * Whiteboard eraser
 */
function setEraser() {
  color = "white";
  drawsize = 10;
}

/**
 * Clean whiteboard content
 */
function cleanBoard() {
  playSound("newMessage");

  Swal.fire({
    background: swalBackground,
    position: "center",
    title: "Clean the board",
    text: "Are you sure you want to clean the board?",
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
}

/**
 * Draw on whiteboard
 * @param {*} newx
 * @param {*} newy
 * @param {*} oldx
 * @param {*} oldy
 */
function draw(newx, newy, oldx, oldy) {
  ctx.strokeStyle = color;
  ctx.lineWidth = drawsize;
  ctx.beginPath();
  ctx.moveTo(oldx, oldy);
  ctx.lineTo(newx, newy);
  ctx.stroke();
  ctx.closePath();
}

/**
 * Resize canvas
 * @param {*} canvas
 */
function fitToContainer(canvas) {
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

/**
 * Handle whiteboard on windows resize
 * here i lose drawing, Todo fix it
 */
function reportWindowSize() {
  fitToContainer(canvas);
}
/**
 * Whiteboard setup
 */
function setupCanvas() {
  fitToContainer(canvas);

  canvas.addEventListener("mousedown", (e) => {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = 1;
  });
  canvas.addEventListener("mousemove", (e) => {
    if (isDrawing) {
      draw(e.offsetX, e.offsetY, x, y);
      x = e.offsetX;
      y = e.offsetY;
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (isDrawing) {
      isDrawing = 0;
    }
  });

  window.onresize = reportWindowSize;
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
    <div id="author"><a href="https://www.linkedin.com/in/miroslav-pejic-976a07101/" target="_blank">Author: Miroslav Pejic</a></div><br>
<a href="https://paypal.me/MiroslavPejic?locale.x=it_IT" target="_blank"><img src="data:image/png;base64,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" alt="Donate" style="width:220px;height:auto;"></a>
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
