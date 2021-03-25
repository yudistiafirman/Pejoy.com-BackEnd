const crypto = require('crypto')

function hashPassword(pass){
    const hmac = crypto.createHmac('sha256', 'abc123');
    hmac.update(pass);
    const passwordHashed = hmac.digest('hex');
    return passwordHashed
}

module.exports = hashPassword