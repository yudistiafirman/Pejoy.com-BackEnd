const util = require('util')
const mysql = require('mysql')
require('dotenv').config()

const db = mysql.createConnection({
    host : process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PASS,
    port :process.env.DB_PORT,
    database : process.env.DB_NAME
})

const query = util.promisify(db.query).bind(db)

module.exports = query