const jwt = require('jsonwebtoken')

const generateToken = (req, res) => {
    let id = req.params.id
    jwt.sign({id : id},'123abc',(err,token) => {
        try {
            if(err) throw err
            res.send({
                error: false,
                message : "register success",
                token
            })
        } catch (error) {
            res.send({
                error: true,
                message : err.message
            })
        }
    })
}

module.exports =  generateToken