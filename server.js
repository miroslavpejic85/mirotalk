/*
http://patorjk.com/software/taag/#p=display&f=ANSI%20Regular&t=Server

███████ ███████ ██████  ██    ██ ███████ ██████  
██      ██      ██   ██ ██    ██ ██      ██   ██ 
███████ █████   ██████  ██    ██ █████   ██████  
     ██ ██      ██   ██  ██  ██  ██      ██   ██ 
███████ ███████ ██   ██   ████   ███████ ██   ██                                           
*/

require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server().listen(server);
const ngrok = require("ngrok");

var ngrokEnabled = process.env.NGROK_ENABLED;
var ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
var turnUrls = process.env.TURN_URLS;
var turnUsername = process.env.TURN_USERNAME;
var turnCredential = process.env.TURN_PASSWORD;

// use all static files from the www folder
app.use(express.static(path.join(__dirname, "www")));

// =====================================================
// expose server to external with https tunnel using ngrok
// =====================================================
async function ngrokStart() {
  try {
    await ngrok.authtoken(ngrokAuthToken);
    await ngrok.connect(PORT);
    const api = ngrok.getApi();
    let data = await api.get("api/tunnels");
    data = JSON.parse(data);
    //console.log(data);
    const pu0 = data.tunnels[0].public_url;
    const pu1 = data.tunnels[1].public_url;
    const tunnelHttps = pu0.startsWith("https") ? pu0 : pu1;
    console.log("ngrok-tunnel", { https: tunnelHttps });
    // https://www.iditect.com/how-to/55122741.html
  } catch (e) {
    console.error("[Error] ngrokStart", e);
  }
}

/*
 * You should probably use a different stun-turn server doing commercial stuff
 * Also see: https://gist.github.com/zziuni/3741933 or https://www.twilio.com/docs/stun-turn
 * Check the functionality of STUN/TURN servers: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
 */
var iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: turnUrls,
    username: turnUsername,
    credential: turnCredential,
  },
];

// =====================================================
// Start Local Server with ngrok https tunnel
// =====================================================
var PORT = process.env.PORT || 80;
server.listen(PORT, null, function () {
  console.log(
    `%c

	███████╗██╗ ██████╗ ███╗   ██╗      ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ 
	██╔════╝██║██╔════╝ ████╗  ██║      ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
	███████╗██║██║  ███╗██╔██╗ ██║█████╗███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
	╚════██║██║██║   ██║██║╚██╗██║╚════╝╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
	███████║██║╚██████╔╝██║ ╚████║      ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
	╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝      ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝ started...

	`,
    "font-family:monospace"
  );

  if (ngrokEnabled == "true") {
    ngrokStart();
  }
  // init settings
  console.log("settings", {
    http: "http://localhost:" + PORT,
    iceServers: iceServers,
  });
});

// All URL patterns should served with the same file.
app.get(["/", "/:room"], (req, res) =>
  res.sendFile(path.join(__dirname, "www/index.html"))
);

var channels = {}; // collect channels
var sockets = {}; // collect sockets

/**
 * Users will connect to the signaling server, after which they'll issue a "join"
 * to join a particular channel. The signaling server keeps track of all sockets
 * who are in a channel, and on join will send out 'addPeer' events to each pair
 * of users in a channel. When clients receive the 'addPeer' even they'll begin
 * setting up an RTCPeerConnection with one another. During this process they'll
 * need to relay ICECandidate information to one another, as well as SessionDescription
 * information. After all of that happens, they'll finally be able to complete
 * the peer connection and will be in streaming audio/video between eachother.
 */
// =====================================================
// on peer connected
// =====================================================
io.sockets.on("connect", (socket) => {
  console.log("[" + socket.id + "] --> connection accepted");

  socket.channels = {};
  sockets[socket.id] = socket;

  // =====================================================
  // on peer diconnected
  // =====================================================
  socket.on("disconnect", () => {
    for (var channel in socket.channels) {
      removePeerFrom(channel);
    }
    console.log("[" + socket.id + "] <--> disconnected");
    delete sockets[socket.id];
  });

  // =====================================================
  // on peer join
  // =====================================================
  socket.on("join", (config) => {
    console.log("[" + socket.id + "] --> join ", config);
    var channel = config.channel;

    if (channel in socket.channels) {
      console.log("[" + socket.id + "] [Warning] already joined", channel);
      return;
    }

    if (!(channel in channels)) {
      channels[channel] = {};
    }
    //
    for (id in channels[channel]) {
      // offer false
      channels[channel][id].emit("addPeer", {
        peer_id: socket.id,
        should_create_offer: false,
        iceServers: iceServers,
      });
      // offer true
      socket.emit("addPeer", {
        peer_id: id,
        should_create_offer: true,
        iceServers: iceServers,
      });
      console.log("[" + socket.id + "] emit add Peer [" + id + "]");
    }

    channels[channel][socket.id] = socket;
    socket.channels[channel] = channel;
  });

  // =====================================================
  // remove peers
  // =====================================================
  function removePeerFrom(channel) {
    if (!(channel in socket.channels)) {
      console.log("[" + socket.id + "] [Warning] not in ", channel);
      return;
    }

    delete socket.channels[channel];
    delete channels[channel][socket.id];

    for (id in channels[channel]) {
      channels[channel][id].emit("removePeer", { peer_id: socket.id });
      socket.emit("removePeer", { peer_id: id });
      console.log("[" + socket.id + "] emit remove Peer [" + id + "]");
    }
  }

  // =====================================================
  // relay ICE to peers
  // =====================================================
  socket.on("relayICE", (config) => {
    let peer_id = config.peer_id;
    let ice_candidate = config.ice_candidate;
    /*
    console.log(
      "[" + socket.id + "] relay ICE-candidate to [" + peer_id + "] ",
      { address: config.ice_candidate.address }
    ); // ice_candidate
    */
    if (peer_id in sockets) {
      sockets[peer_id].emit("iceCandidate", {
        peer_id: socket.id,
        ice_candidate: ice_candidate,
      });
    }
  });

  // =====================================================
  // relay SDP to peers
  // =====================================================
  socket.on("relaySDP", (config) => {
    let peer_id = config.peer_id;
    let session_description = config.session_description;

    console.log(
      "[" + socket.id + "] relay SessionDescription to [" + peer_id + "] ",
      { type: session_description.type }
    ); // session_description

    if (peer_id in sockets) {
      sockets[peer_id].emit("sessionDescription", {
        peer_id: socket.id,
        session_description: session_description,
      });
    }
  });

  // =====================================================
  // handle peer message
  // =====================================================
  socket.on("msg", (config) => {
    let peers = config.peers;
    let msg = config.msg;

    console.log("[" + socket.id + "] emit onMessage", {
      msg: msg,
    });

    for (peer_id in peers) {
      sockets[peer_id].emit("onMessage", {
        msg: msg,
      });
    }
  });
}); // end [sockets.on-connect]
