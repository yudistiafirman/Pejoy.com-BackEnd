const validator = require('validator')
const query = require('../database/mysqlAsync')
const fs = require('fs')
const handlebars = require('handlebars')
const hashPassword = require('./../helpers/hashPassword')
const jwt = require('jsonwebtoken')
const transporter = require('./../helpers/transporter')
const {OAuth2Client} = require('google-auth-library')
const db = require('./../database/mysql')
const fetch = require("node-fetch");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT)
require('dotenv').config()
const RegisterComtroller = async (req, res) => {
    const data = req.body // {email, password}
    const re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/

    const userExistQuery =  'select * from users where email = ?'
    const storeToDbUser = 'insert into users set ?'
    const storeToDbDetailUser = 'insert into user_detail set ?'
    const getDataUser = 'select * from users where id = ?'

    try {
        if(!data.email || !data.password || !data.username) throw 'Data not complete'
        if(!(validator.isEmail(data.email))) throw 'Email format wrong'
        if(!(re.test(data.password))) throw 'Password must contain at least one uppercase letter, one lowercase letter and one number'
        if(data.username.length <= 3 || data.username.length >= 32 ) throw 'Username min 3 character and maximal 32 character'

        const passwordHashed = hashPassword(data.password)
        data.password = passwordHashed

        try {
            const userExist = await query(userExistQuery,data.email)
            
            .catch(error => {
                throw error
            })
            if(userExist.length !== 0) throw 'Email sudah terdaftar'
            if(userExist[0].is_email_verified!==1) throw 'Email belum terverifikasi'
            const resultToUserDetail = await query(storeToDbDetailUser, {user_name : data.username})
            .catch(error => {
                throw error
            })

            let user_detail_id = resultToUserDetail.insertId
            const resultToUsers = await query(storeToDbUser, {email : data.email, password : data.password, user_detail_id : user_detail_id})
            .catch(error => {
                throw error
            })

            const resultGetUsers = await query(getDataUser, resultToUsers.insertId)
            .catch(error => {
                throw error
            })


            const token = jwt.sign({id:resultToUsers.insertId},process.env.SECRET_KEY,{expiresIn:'30d'})
            

            fs.readFile('D:/project_firman/pejoy.com_back_end/template/confirmation.html',
            {encoding : 'utf-8'}, (err, file) => {
                if(err) throw err
                const template = handlebars.compile(file)
                const resultTemplate = template({
                    userName : data.username,
                    link : `https://pejoy-online.netlify.app/email-verification/` + token
                })
                transporter.sendMail({
                    from : "admin",
                    subject : "email verification",
                    to : data.email,
                    html : resultTemplate
                })
                .then((respon) => {
                    res.send({
                        error : false,
                        message : "Pendaftaran berhasil,Coba cek email kamu dan verfikasi ,sebelum bisa menikmati fitur kami",
                     
                    })
                })
                .catch((err) => {
                    res.send({
                        error: true,
                        message : err.message
                    })
                })
            })
            
            
        } catch (error) {
            res.send({
                error : true,
                message : error
            })
        }

    } catch (error) {
        res.send({
            error : true,
            message : error
        })
    }
}

const LoginController = async (req, res) => {
    const data = req.body // {email, password}

    const passwordHashed = hashPassword(data.password)
    data.password = passwordHashed
    const userLoginQuery = 'select * from users where email = ? and password = ?;'

    try {
        if(!data.email || !data.password) throw 'Data not complete'
        const resultUserLogin = await query(userLoginQuery, [data.email, data.password])
        .catch(error => {
            throw error
        })

        if(resultUserLogin.length === 0) throw 'Email tidak terdaftar atau Password salah!'
        if(resultUserLogin[0].is_email_verified!==1) throw 'Email belum terverifkasi'
        const token = jwt.sign({id:resultUserLogin[0].id, role : resultUserLogin[0].user_role},process.env.SECRET_KEY,{expiresIn:'30d'})
        res.send({
            error : false,
            message : 'Login succes',
            token : token,
            role : resultUserLogin[0].user_role
        })
    } catch (error) {
        res.send({
            error : true,
            message : error
        })
    }
}

const GoogleLogin = (req, res) => {
    const {idToken} = req.body
    // Get token from request

    // Verify token
    try {
        if(idToken){
            client.verifyIdToken({idToken, audience :process.env.GOOGLE_CLIENT })
            .then(response => {
                const {
                    email_verified,
                    name,
                    email
                } = response.payload
        
                // check if email verified
                if(email_verified){
                    // find from db users email yg diberikan google
                    db.query('select * from users where email = ?', email, (err, result) => {
                        try {
                            if(err) throw err
                            if(result.length !== 0){
                                // if user exist
                                const token = jwt.sign({id:result[0].id, role : result[0].user_role},process.env.SECRET_KEY,{expiresIn:'30d'})
                                res.send({
                                    error : false,
                                    message : 'Login succes',
                                    token : token,
                                    role : result[0].user_role
                                })
                            }else{
                                // if user not exist store to database and generate password cz password in db not null
                                let password = email + process.env.SECRET_KEY
        
                                // store to detail user
                                db.query('insert into user_detail set ?', {user_name : name}, (err, resultDetail) => {
                                    try {
                                        if(err) throw err
                                        
                                        // if not error
                                        db.query('insert into users set ?', {email : email, password : password, user_detail_id : resultDetail.insertId,is_email_verified:1 }, (err, resultUser) => {
                                            try {
                                                if(err) throw err
                                                db.query('select * from users where id = ?', resultUser.insertId, (err, result) => {
                                                    try {
                                                        if(err) throw err
                                                        const token = jwt.sign({id:resultUser.insertId, role : result[0].user_role},process.env.SECRET_KEY,{expiresIn:'30d'})
                                                        res.send({
                                                            error : false,
                                                            message : 'Login succes',
                                                            token : token,
                                                            role : result[0].user_role
                                                        })
                                                    } catch (error) {
                                                        res.send({
                                                            error : true,
                                                            message : error
                                                        })   
                                                    }
                                                } )
                                                
                                            } catch (error) {
                                                res.send({
                                                    error : true,
                                                    message : error
                                                })
                                            }
                                        })
                                    } catch (error) {
                                        res.send({
                                            error : true,
                                            message : error
                                        })
                                    }
                                })
                            }
                        } catch (error) {
                            res.send({
                                error : true,
                                message : error
                            })
                        }
                    })
                }else{
                    res.send({
                        error : true,
                        message : 'Google Login gagal. try again'
                    })
                }
            })
        }
    } catch (error) {
        res.send({
            error : true,
            message : error
        })
    }
}

const FacebookLogin = (req, res) => {
    const {userID, accessToken} = req.body

    const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;

    return (
        fetch(url, {
            method : 'GET'
        })
        .then(response => response.json())
        // .then(response => console.log(response))
        .then(response => {
            const {email, name} = response
            db.query('select * from users where email = ?', email, (err, result) => {
                try {
                    if(err) throw err
                    if(result.length !== 0){
                        // user exist
                        const token = jwt.sign({id:result[0].id, role : result[0].user_role},process.env.SECRET_KEY,{expiresIn:'30d'})
                        res.send({
                            error : false,
                            message : 'Login succes',
                            token : token,
                            role : result[0].user_role
                        })
                    }else{
                        let password = email + process.env.SECRET_KEY

                        db.query('insert into user_detail set ?', {user_name : name}, (err, resultDetail) => {
                            try {
                                if(err) throw err
                                
                                // if not error
                                db.query('insert into users set ?', {email : email, password : password, user_detail_id : resultDetail.insertId,is_email_verified:1  }, (err, resultUser) => {
                                    try {
                                        if(err) throw err
                                        db.query('select * from users where id = ?', resultUser.insertId, (err, result) => {
                                            try {
                                                if(err) throw err
                                                const token = jwt.sign({id:resultUser.insertId, role : result[0].user_role},process.env.SECRET_KEY,{expiresIn:'30d'})
                                                res.send({
                                                    error : false,
                                                    message : 'Login with Facebook succes',
                                                    token : token,
                                                    role : result[0].user_role
                                                })
                                            } catch (error) {
                                                res.send({
                                                    error : true,
                                                    message : error
                                                })
                                            }
                                        })

                                    } catch (error) {
                                        res.send({
                                            error : true,
                                            message : error
                                        })
                                    }
                                })
                            } catch (error) {
                                res.send({
                                    error : true,
                                    message : error
                                })
                            }
                        })
                        
                        
                    }
                } catch (error) {
                    res.send({
                        error : true,
                        message : error
                    })
                }
            })
        })
        .catch((error) => {
            res.send({
                error : true,
                message : 'Facebook login gagal'
            })
        })
    )
}

const ForgotPassword = (req, res) => {
    const {email} = req.body

    try {
        if(!email) throw new Error('Email tidak boleh kosong')
        db.query('select * from users where email = ?', email, (err, result) => {
            try {
                if(err) throw err
                if(result.length === 0) throw 'Email tidak terdaftar'

                const tokenForgotPassword = jwt.sign({email : email},process.env.SECRET_KEY,{expiresIn:'4h'})

                fs.readFile('D:/project_firman/pejoy.com_back_end/template/confirmation.html',
                {encoding : 'utf-8'}, (err, file) => {
                if(err) throw err
                const template = handlebars.compile(file)
                const resultTemplate = template({
                    userName : email,
                    link : `https://pejoy-online.netlify.app/update-password/` + tokenForgotPassword
                })
                transporter.sendMail({
                    from : "admin",
                    subject : "email verification",
                    to : email,
                    html : resultTemplate
                })
                .then((respon) => {
                    res.send({
                        error : false,
                        message : "email alerady sent !",
                    })
                })
                .catch((err) => {
                    res.send({
                        error: true,
                        message : err.message
                    })
                })
            })
                
            } catch (error) {
                res.send({
                    error : true,
                    message : error
                })
            }
        })
    } catch (error) {
        res.send({
            error : true,
            message : error
        })
    }
}

const UpdatePassword = (req, res) => {
    const {email, password} = req.body

    const passwordHashed = hashPassword(password)
    try {
        if(!email || !password) throw 'Data not complete'
        jwt.verify(email, process.env.SECRET_KEY, (err, dataToken) => {
            try {
                if(err) throw err
                let emailUser = dataToken.email
                db.query(`update users set password = ? where email = ?;`,[passwordHashed, emailUser], (err, result) => {
                    try {
                        if(err) throw err
                        res.send({
                            error : false,
                            message : 'update password success'
                        })
                    } catch (error) {
                        res.send({
                            error : true,
                            message : error
                        })
                    }
                })
            } catch (error) {
                res.send({
                    error : true,
                    message : error
                })
            }
        })

    } catch (error) {
        res.send({
            error : true,
            message : error
        })
    }

    
}


const VerifiedEmail=async(req,res)=>{
    try {
        const {id}= req.dataToken
        console.log(id)
        let updateEmailVerifiedValue= await query('update users set is_email_verified=1 where id =?',id)
        if(updateEmailVerifiedValue.affectedRows===1){
            const token = jwt.sign({id:id},process.env.SECRET_KEY,{expiresIn:'30d'})
            res.send({
                success:true,
                token
            })
        }else{
            res.send({
                success:false,
                message:'something went wrong ,try to reload the page after sometimes'
            })
        }
    } catch (error) {
        res.send({
            success:false,
            message:'something went wrong ,try to reload the page after sometimes'
        })
    }
    



}

const ChangeUserName= async (req,res)=>{
    try {
        const {id}=req.dataToken
        const {newName}=req.body

        let userdetail_id= await query('select user_detail_id from users where id =? ',id)
        let insertNewName= await query(`update user_detail set? where id=${userdetail_id[0].user_detail_id}`,{user_name:newName})
        
        if(insertNewName.affectedRows===1){
            res.send({
                success:true,
                message:'Nama kamu telah berhasil diganti'
            })
        }else{
            res.send({
                success:false,
                message:'Something went wrong'
            })
        }

    } catch (error) {
    
        res.send({
            success:false,
            message:'Something went wrong please try again'
        })
    }
    

    
}

module.exports = {
    RegisterComtroller,
    LoginController,
    GoogleLogin,
    FacebookLogin,
    ForgotPassword,
    UpdatePassword,
    VerifiedEmail,
    ChangeUserName
}