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
const myChatAvatar = "/images/programmer.png";
const friendChatAvatar = "/images/friend.png";
const notifyBySound = true; // turn on-off sound notifications
var myChatName = null;
var signalingServerPort = 80;
var signalingServer = getserverURL();
var roomId = getRoomId();
var peerInfo = getPeerInfo();
var peerConnection = null;
var useAudio = true;
var useVideo = true;
var camera = "user";
var isScreenStreaming = false;
var isChatBoxVisible = false;
var signalingSocket = null; // socket.io connection to our webserver
var localMediaStream = null; // my microphone / webcam
var remoteMediaStream = null; // friends microphone / webcam
var peers = {}; // keep track of our peer connections, indexed by peer_id == socket.io id
var peerMediaElements = {}; // keep track of our <video> tags, indexed by peer_id
var iceServers = [{ urls: "stun:stun.l.google.com:19302" }]; // backup iceServers

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
    browserName: DetectRTC.browser.name,
    browserVersion: DetectRTC.browser.version,
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
    const newurl = signalingServer + "/" + roomId;
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

    if (config.iceServers) iceServers = config.iceServers;
    console.log("iceServers", iceServers[0]);

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    peerConnection = new RTCPeerConnection(
      { iceServers: iceServers },
      {
        optional: [
          { DtlsSrtpKeyAgreement: true }, // is required for Chrome and Firefox to interoperate.
          { RtpDataChannels: DetectRTC.isRtpDataChannelsSupported }, // is required if we want to make use of the DataChannels API on Firefox.
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
        if (!isChatBoxVisible) {
          showChatRoom();
          get("chatRoomBtn").className = "fas fa-comment-slash";
        }
        playSound("newMessage");
        appendMessage(config.name, friendChatAvatar, "left", config.msg);
        break;
    }
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
    video: useVideo,
    audio: useAudio,
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
// check if there is peers
// =====================================================
function noPeers() {
  if (Object.keys(peers).length === 0) {
    return true;
  }
  return false;
}

// =====================================================
// WebRTC buttons
// =====================================================
function manageButtons() {
  setCopyRoomBtn();
  setAudioBtn();
  setVideoBtn();
  setSwapCameraBtn();
  setScreenShareBtn();
  setFullScreenBtn();
  setSendMsgBtn();
  setChatRoomBtn();
  setAboutBtn();
  setLeaveRoomBtn();
  setButtonsOpacity();
}

// =====================================================
// copy Room URL button click event
// =====================================================
function setCopyRoomBtn() {
  get("copyRoomBtn").addEventListener("click", (e) => {
    copyRoomURL();
  });
}

// =====================================================
// audio mute-unmute button click event
// =====================================================
function setAudioBtn() {
  get("audioBtn").addEventListener("click", (e) => {
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
function setVideoBtn() {
  get("videoBtn").addEventListener("click", (e) => {
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
function setSwapCameraBtn() {
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
      get("swapCameraBtn").style.display = "none";
    }
  });
}

// =====================================================
// check if can share a screen, if yes show button else hide it
// =====================================================
function setScreenShareBtn() {
  if (navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia) {
    // share-screen on-off button click event
    get("screenShareBtn").addEventListener("click", (e) => {
      toggleScreenSharing();
    });
  } else {
    get("screenShareBtn").style.display = "none";
  }
}

// =====================================================
// full screen Button click event
// =====================================================
function setFullScreenBtn() {
  if (DetectRTC.browser.name != "Safari") {
    // detect Esc full screen mode
    document.addEventListener("fullscreenchange", function (e) {
      var fullscreenElement = document.fullscreenElement;
      if (!fullscreenElement) {
        get("fullScreenBtn").className = "fas fa-expand-alt";
      }
    });

    get("fullScreenBtn").addEventListener("click", (e) => {
      toggleFullScreen();
    });
  } else {
    get("fullScreenBtn").style.display = "none";
  }
}

// =====================================================
// send message button click event
// =====================================================
function setSendMsgBtn() {
  get("sendMsgBtn").addEventListener("click", (e) => {
    sendMessage();
  });
}

// =====================================================
// chat room button click event
// =====================================================
function setChatRoomBtn() {
  // Make chat room draggable
  dragElement(get("msgerDraggable"));

  get("chatRoomBtn").addEventListener("click", (e) => {
    if (noPeers()) {
      userLog("info", "Can't Open Chat Room, no peer connection detected");
      return;
    }
    e.target.className = "fas fa-comment" + (isChatBoxVisible ? "" : "-slash");
    if (!isChatBoxVisible) {
      showChatRoom();
    } else {
      get("msgerDraggable").style.display = "none";
      isChatBoxVisible = false;
    }
  });

  get("msgerSendBtn").addEventListener("click", (e) => {
    e.preventDefault(); // prevent refresh page
    const msg = get("msgerInput").value;
    if (!msg) return; // empity msg

    emitMsg(myChatName, msg, "chat");
    appendMessage(myChatName, myChatAvatar, "right", msg);

    get("msgerInput").value = "";
  });

  get("msgerHeaderHide").addEventListener("click", (e) => {
    get("msgerDraggable").style.display = "none";
    get("chatRoomBtn").className = "fas fa-comment";
    isChatBoxVisible = false;
  });
}

// =====================================================
// about button click event
// =====================================================
function setAboutBtn() {
  get("aboutBtn").addEventListener("click", (e) => {
    about();
  });
}

// =====================================================
// end call button click event
// =====================================================
function setLeaveRoomBtn() {
  get("leaveRoomBtn").addEventListener("click", (e) => {
    leaveRoom();
  });
}

// =====================================================
// set button opacity 1 means no opacity, you can change if like (0.5) ..
// =====================================================
function setButtonsOpacity() {
  get("buttons").style.opacity = "1";
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
  if (noPeers()) {
    userLog("info", "Can't Send msg, no peer connection detected");
    return;
  }
  Swal.fire({
    background: "black",
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
    background: "black",
    position: "center",
    icon: "success",
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
// chat room form
// =====================================================
function showChatRoom() {
  if (!myChatName) {
    Swal.fire({
      background: "black",
      position: "center",
      icon: "info",
      title: "Enter your chat name",
      input: "text",
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp",
      },
      inputValidator: (value) => {
        if (!value) {
          return "Please write your chat name.";
        }
        myChatName = value;
        get("msgerDraggable").style.display = "flex";
        isChatBoxVisible = true;
      },
    });
  } else {
    // chat name already set just open chat room
    get("msgerDraggable").style.display = "flex";
    isChatBoxVisible = true;
  }
}

// =====================================================
// drag char room element
// =====================================================
function dragElement(elmnt) {
  // https://www.w3schools.com/howto/howto_js_draggable.asp
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  if (get("msgerHeader")) {
    /* if present, the header is where you move the DIV from:*/
    get("msgerHeader").onmousedown = dragMouseDown;
  } else {
    /* otherwise, move the DIV from anywhere inside the DIV:*/
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
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// =====================================================
// append Message to msger chat room
// =====================================================
function appendMessage(name, img, side, text) {
  const msgHTML = `
	<div class="msg ${side}-msg">
		<div class="msg-img" style="background-image: url(${img})"></div>
		<div class="msg-bubble">
		<div class="msg-info">
			<div class="msg-info-name">${name}</div>
			<div class="msg-info-time">${formatDate(new Date())}</div>
		</div>
		<div class="msg-text">${text}</div>
		</div>
	</div>
  `;
  get("msgerChat").insertAdjacentHTML("beforeend", msgHTML);
  get("msgerChat").scrollTop += 500;
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
// active - disactive screen sharing
// =====================================================
function toggleScreenSharing() {
  if (noPeers()) {
    userLog("info", "Can't Toggle screen sharing, no peer connection detected");
    return;
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
    get("videoBtn").className = "fas fa-video"; // make sure to enable video
  }
  screenMediaPromise
    .then((screenStream) => {
      isScreenStreaming = !isScreenStreaming;

      for (peer_id in peers) {
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
      attachMediaStream(get("myVideo"), localMediaStream); // newstream

      get("myVideo").classList.toggle("mirror");
      get("screenShareBtn").classList.toggle("active");
      get("screenShareBtn").className = isScreenStreaming
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
// enter - esc on full screen mode
// =====================================================
function toggleFullScreen() {
  // https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    get("fullScreenBtn").className = "fas fa-compress-alt";
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      get("fullScreenBtn").className = "fas fa-expand-alt";
    }
  }
}

// =====================================================
// swapCamer front(user) - rear(environment)
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
      for (peer_id in peers) {
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
      attachMediaStream(get("myVideo"), localMediaStream);

      get("myVideo").classList.toggle("mirror");
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
  console.log("Copied to clipboard Join Link ", ROOM_URL);
  Swal.fire({
    background: "black",
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
// about info
// =====================================================
function about() {
  Swal.fire({
    background: "black",
    position: "center",
    title: "<strong>Made with ❤️</strong>",
    imageUrl: loaderGif,
    imageWidth: 320,
    imageHeight: 240,
    imageAlt: "Custom image",
    html:
      "<b>Open Source</b> project on" +
      '<a href="https://github.com/miroslavpejic85/mirotalk" target="_blank"> GitHub</a> ',
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
    // ...
    default:
      console.log("no file audio");
  }
  if (file_audio != "") {
    audioToPlay = new Audio(file_audio);
    try {
      await audioToPlay.play();
    } catch (e) {
      // console.error("Cannot play sound", e);
      // Automatic playback failed.
      return;
    }
  }
}

// utils
function get(id) {
  return document.getElementById(id);
}
// date now
function formatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();
  return `${h.slice(-2)}:${m.slice(-2)}`;
}