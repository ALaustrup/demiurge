const express = require('express');
const router = express.Router();
const {
  listNFTForSale,
  getListings,
  buyNFTFromMarketplace,
  cancelListing,
} = require('../controllers/marketplaceController');
const { authenticateToken } = require('../middleware/auth');

router.post('/list', authenticateToken, listNFTForSale);
router.get('/listings', getListings);
router.post('/buy', authenticateToken, buyNFTFromMarketplace);
router.delete('/listings/:listingId', authenticateToken, cancelListing);

module.exports = router;

