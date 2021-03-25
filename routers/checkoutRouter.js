const express = require('express');
const Router = express.Router();
const checkoutController = require('./../controllers/checkoutController');

Router.post('/mytransaction', checkoutController.getUsersDataTransactionsToCheckout)
Router.post('/payment', checkoutController.onPaymentUsersTransaction)

module.exports = Router