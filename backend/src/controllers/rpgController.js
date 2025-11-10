const rpgService = require("../services/rpgService");

async function startEncounter(req, res, next) {
  try {
    const userId = req.user.id;
    const { attackerNftId } = req.body;

    if (!attackerNftId) {
      return res.status(400).json({ error: "INVALID_REQUEST", message: "attackerNftId is required" });
    }

    const encounter = await rpgService.startRpgEncounter(userId, attackerNftId);
    res.json(encounter);
  } catch (err) {
    if (err.code === "INVALID_PARTY_NFT") {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    next(err);
  }
}

module.exports = {
  startEncounter,
};

