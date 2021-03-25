const {check}= require('express-validator')



module.exports={
    validRegister:[
        
    check('username', 'Name is required').notEmpty()
    .isLength({
        min: 4,
        max: 32
    }).withMessage('name must be between 3 to 32 characters'),
    check('email')
    .isEmail()
    .withMessage('Must be a valid email address'),
    check('password', 'password is required').notEmpty(),
    check('password').isLength({
        min: 6
    }).withMessage('Password must contain at least 6 characters').matches(/\d/).withMessage('password must contain a number')
],

    validLogin:[
        check('email')
    .isEmail()
    .withMessage('Must be a valid email address'),
    check('password', 'password is required').notEmpty(),
    check('password').isLength({
        min: 6
    }).withMessage('Password must contain at least 6 characters').matches(/\d/).withMessage('password must contain a number')
    ],

    phoneValidator:[
    check('phonenumber')
    .isMobilePhone()
    .withMessage('must be a valid phonenumber'),
    check('phonenumber','phone number is required').notEmpty(),
    check('phonenumber').isLength({
        min:11,
        max:13,
    }).withMessage('phone number must at least container 11 digits and not morethan 13 digits')    
    ],

    forgotPasswordValidator:[forgotPasswordValidator = check('email')
            .not()
            .isEmpty()
            .isEmail()
            .withMessage('Must be a valid email address')
    ],

    resetPasswordValidator:[
        check('newPassword')
        .not()
        .isEmpty()
        .isLength({ min: 6 })
        .withMessage('Password must contain at least 6 characters').matches(/\d/).withMessage('password must contain a number')
    ],
    validEmail: [check('email')
    .isEmail()
    .withMessage('Must be a valid email address')]
}