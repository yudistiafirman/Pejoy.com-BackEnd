const Logging = (req, res, next) => {
    console.log(req.method + ' || ' + req.originalUrl + ' || ' + new Date())
    next()
}

module.exports = Logging