const jwt = require('jsonwebtoken')

const jwtParamsVerify = (req, res, next) => {
    const token = req.params.token
  


    jwt.verify(token, process.env.SECRET_KEY, (err, dataToken) => {
        try {
            if(err) throw err
         
            req.dataToken = dataToken
            next()
        } catch (error) {
            //    res.status(400).send({
            //        success:false,
            //        message:'your session is over'
            //    })
            console.log(error)
        }
    })
}   

module.exports = jwtParamsVerify