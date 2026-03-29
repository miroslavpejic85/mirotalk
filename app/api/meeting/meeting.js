// Import required modules
const express = require('express');
const router = express.Router();

// Define meeting route
router.get('/', (req, res) => {
  res.render('meeting', {
    title: 'MiroTalk P2P Meeting',
    // Add SFU-inspired chat UI elements
    chatUI: {
      publicMessages: [],
      privateMessages: [],
      participants: []
    }
  });
});

module.exports = router;