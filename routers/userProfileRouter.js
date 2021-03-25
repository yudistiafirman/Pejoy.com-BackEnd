const express = require('express');
const Router = express.Router();
const userProfileController = require('./../controllers/userProfileController');
const jwtVerify = require('../middleware/jwt')

Router.post('/profile', jwtVerify, userProfileController.getDataUsers)
Router.post('/transactions', jwtVerify, userProfileController.getDataTransactionsUsers)
Router.post('/expired-transaction', userProfileController.onExpiredTransaction)
Router.post('/confirm-transaction', jwtVerify, userProfileController.confirmMyTransaction)
Router.post('/shipping-address', jwtVerify, userProfileController.getUserShippingAddress)
Router.post('/shipping-address/add-address', jwtVerify, userProfileController.addShippingAddress)
Router.post('/shipping-address/edit-main-address', jwtVerify, userProfileController.updateShippingaddress)

Router.post('/shipping-address/edit-address', userProfileController.getUsersShippingAddressToEdit)
Router.post('/shipping-address/update-address', userProfileController.updateUsersShippingAddress)
Router.delete('/shipping-address/delete-address/:token/:idAddress', userProfileController.deleteUsersShippingAddress)
Router.get('/shipping-address/get-raja-ongkir-province', userProfileController.getRajaOngkirProvince)
Router.get('/shipping-address/get-raja-ongkir-city', userProfileController.getRajaOngkirCity)
Router.get('/admin-dashboard/data-statistic', userProfileController.getDataStatistic)
Router.post('/admin-dashboard/users-transaction/get-transactions', userProfileController.getUsersTransactions)
Router.post('/admin-dashboard/users-transaction/deliver-product', userProfileController.deliverProductsToCustomer)
Router.get('/admin-dashboard/warehouse-inventory', userProfileController.getWarehouseInventory)
Router.get('/admin-dashboard/flash-sale/get-products-discount', userProfileController.getDiscountProducts)
Router.post('/admin-dashboard/flash-sale/create-flash-sale-event', userProfileController.createFlashSaleEvent)
// Router.post('/try-query', userProfileController.tryQuery)

module.exports = Router