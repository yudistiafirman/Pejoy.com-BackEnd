const {FacebookLogin,ChangeUserName ,GoogleLogin, RegisterComtroller, LoginController, ForgotPassword, UpdatePassword, VerifiedEmail } = require('../controllers/AuthController')
const { validationRegister } = require('../helpers/validate')
const jwtVerify = require('../middleware/jwt')
const jwtParamsVerify = require('../middleware/paramsjwt')
const Route = require('express').Router()


Route.post('/register', RegisterComtroller)
Route.post('/login', LoginController)
Route.post('/googlelogin', GoogleLogin)
Route.post('/facebooklogin', FacebookLogin)
Route.post('/forgotpassword', ForgotPassword)
Route.post('/update-password', UpdatePassword)
Route.patch('/verified/:token',jwtParamsVerify,VerifiedEmail)
Route.patch('/changename/:token',jwtParamsVerify,ChangeUserName)




module.exports = Route