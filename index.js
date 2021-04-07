const express = require('express');
const cors = require('cors');
const LoggingAPI = require('./middleware/LoggingAPI');
const morgan =require('morgan')
const landingPageRouter = require('./routers/landingPageRouter');
const productRouter = require('./routers/productRouter');
const userProfileRouter = require('./routers/userProfileRouter');
const userAuth=require('./routers/userAuth')
const checkoutRouter=require('./routers/checkoutRouter')
const authRouter = require('./routers/authRouter')

const PORT = 2000

const app = express()
app.use(express.json())
app.use(cors())





app.use(morgan('dev'))
// For Get Image
app.use('/public', express.static('public'))
// Router For Landing Page
app.use('/', landingPageRouter)
// Router For Products
app.use('/products', productRouter)
// Router For User Profile
app.use('/member', userProfileRouter)
// Router For Checkout
app.use('/checkout', checkoutRouter)
// Router for auth
app.use('/authBaru', authRouter)

app.listen(process.env.PORT||PORT, () => console.log(`API Running On Port ${PORT}`))