const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const rpgController = require("../controllers/rpgController");
const partyController = require("../controllers/partyController");

router.post("/encounter", authenticateToken, rpgController.startEncounter);
router.get("/party", authenticateToken, partyController.getMyParty);

module.exports = router;

