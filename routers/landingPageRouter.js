const express = require('express');
const Router = express.Router();
const landingPageController = require('./../controllers/landingPageController');

Router.get('/products-flash-sale', landingPageController.getAllFlashSaleProducts)
Router.get('/products-best-seller', landingPageController.getAllBestSellerProducts)

module.exports = Router