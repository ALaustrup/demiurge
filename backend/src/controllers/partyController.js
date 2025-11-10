const partyService = require("../services/partyService");

async function getMyParty(req, res, next) {
  try {
    const userId = req.user.id;
    const party = await partyService.getUserParty(userId);
    res.json({ party });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyParty,
};

