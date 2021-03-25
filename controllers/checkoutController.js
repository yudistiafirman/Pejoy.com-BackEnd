const Axios = require('axios');
const db = require('./../database/mysql');
const query = require('./../database/mysqlAsync');;
const jwt = require('jsonwebtoken');
const multer = require('multer')

const singleUpload = require('./../helpers/SingleUpload')()

module.exports = {

    getUsersDataTransactionsToCheckout: (req, res) => {
        let transaction_id = req.body.transaction_id
        db.query(`select sa.receiver_name,sa.phone_number from shipping_address sa where sa.users_id = (select users_id from transaction where id = ${transaction_id} )`,(err,response)=>{
            try {
                if(err)throw err
            
                db.query(`SELECT t.id, t.created_at, t.expired_at, td.product_name, td.product_price,(td.product_price*p.discount/100) *td.qty as discount , td.qty, t.shipping_rates, t.total_amount, t.shipping_to FROM transaction t
                JOIN transaction_detail td ON t.id = td.transaction_id join variant_product vp on td.variant_product_id = vp.id
                join products p on vp.products_id = p.id where t.id = ?`, transaction_id, (err, result) => {
                    try {
                        if(err) throw err
                   
                        result[0].receiver_name=response[0].receiver_name
                        result[0].phonenumber=response[0].phone_number
                     
                        res.send({
                            error: false,
                            message : 'Get Data Transactions To Checkout Success',
                            data : result
                        })
                    } catch (error) {
                        res.send({
                            error: true,
                            message : error.message
                        })
                      
                    }
                })
            } catch (error) {
                res.send({
                    error: true,
                    message : error.message
                })
            }


        })
      
    },

    onPaymentUsersTransaction: (req, res) => {
        // Step1. Upload Image to Storage (API)
        singleUpload(req, res, (err) => {
            try {
                if(err) throw err

                // Step2. Request Validation for Filtering & Filtering If File Does Not Exist
                if(req.filteringValidation) throw { message : req.filteringValidation }
                if(req.file === undefined) throw { message : 'File Not Found'}
    
                // Step3. Get Image Path
                var imagePath = 'http://localhost:2000/' + req.file.path
    
                // Step4. Get Text Data
                var data = req.body.data
                try {
                    var dataParsed = JSON.parse(data)
                    console.log(dataParsed)
                } catch (error) {
                    console.log(error)
                }

                db.query('UPDATE status_transaction SET is_done = 1 WHERE transaction_id = ? AND status_name_id = 1;', dataParsed.transaction_id, (err, result) => {
                    try {
                        if(err) throw err

                        db.query('INSERT INTO status_transaction SET ?;', {transaction_id: dataParsed.transaction_id, status_name_id: 2, is_done: 0}, (err, result) => {
                            try {
                                if(err) throw err
                                
                                db.query('UPDATE transaction SET evidence = ? WHERE id = ?;', [imagePath, dataParsed.transaction_id], (err, result1) => {
                                    try {
                                        if(err) throw err
                                        console.log(result1)
                                        res.json({
                                            error : false, 
                                            message : 'Payment Success'
                                        })
                                    } catch (error) {
                                        console.log(error)
                                    }
                                })
                            } catch (error) {
                                res.json({
                                    error : true,
                                    message : 'Error When Update Paid Status',
                                    detail : error
                                })
                            }
                        })
                    } catch (error) {
                        res.json({
                            error : true, 
                            message : 'Error When Update Waiting For Payment Status',
                            detail : error
                        })
                    }
                })
            } catch (error) {
                res.json({
                    error : true, 
                    message : error.message
                })
            }
        })
    }

}