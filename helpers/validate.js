const {check}= require('express-validator')

module.exports = {
    validationRegister:[
        check('email', 'Email not null').notEmpty()
        .isEmail()
        .withMessage('Must be a valid email address'),
        check('password', 'password is required').notEmpty(),
        check('password').isLength({
            min: 6
        }).withMessage('Password must contain at least 6 characters').matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/, "i").withMessage('Password must contain at least one uppercase letter, one lowercase letter and one number')
    ]
}