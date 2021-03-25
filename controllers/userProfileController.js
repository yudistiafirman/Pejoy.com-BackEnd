const Axios = require('axios');
const db = require('./../database/mysql');
const query = require('./../database/mysqlAsync');;
const jwt = require('jsonwebtoken');

module.exports = {
    getDataUsers: (req, res) => {
        const users_id = req.dataToken.id
        console.log(users_id)

        db.query(`SELECT u.id, ud.user_name, u.email,u.is_email_verified, ud.phone_number,ud.is_phone_verified, u.created_at, u.user_role  FROM user_detail ud
        JOIN users u ON ud.id = u.user_detail_id WHERE u.id = ?;`, users_id, (err, result) => {
            try {
                if(err) throw err
                console.log(result)
                res.send({
                    error: false,
                    message : 'Get Data User Success',
                    data : result
                })
            } catch (error) {
                res.send({
                    error: true,
                    message : error.message
                })
              
            }
        })
    },

    getDataTransactionsUsers: async (req, res) => {
        const users_id = req.dataToken.id
        const data = req.body.status_name_id
      

        let getTransactionsQuery = `SELECT t.id, p.id AS product_id, t.total_amount, t.shipping_rates, t.shipping_to, td.variant_product_id, b.brands_name, td.product_name, td.product_price, td.qty, 
        g.id AS gudang_id, td.url AS image_product, td.shipping_address, st.date AS transaction_date, t.created_at, t.expired_at,
        st.status_name_id, sn.name AS status, st.is_done, u.id AS users_id FROM transaction_detail td
        JOIN variant_product vp ON td.variant_product_id = vp.id
        JOIN products p ON vp.products_id = p.id
        JOIN brands b ON p.brands_id = b.id
        JOIN transaction t ON td.transaction_id = t.id
        JOIN status_transaction st ON td.transaction_id = st.transaction_id
        JOIN status_name sn ON st.status_name_id = sn.id
        JOIN gudang g ON td.gudang_id = g.id
        JOIN users u ON t.users_id = u.id
        WHERE u.id = ? AND st.status_name_id = ? AND st.is_done != 1`

        let getHistoryTransactionsQuery = `SELECT t.id, st.date AS transaction_date, sn.name AS status_name, is_done FROM status_transaction st
        JOIN transaction t ON st.transaction_id = t.id
        JOIN users u ON t.users_id = u.id
        JOIN status_name sn ON st.status_name_id = sn.id
        WHERE u.id = ?`

        try {
            let dataTransactionsUsers = await query(getTransactionsQuery, [users_id, data])
            let dataHistoryTransactionsUsers = await query(getHistoryTransactionsQuery, users_id)
            console.log(dataTransactionsUsers)
            let mapDataTransactionsUsers = []

            dataTransactionsUsers.forEach((value1, index1) => {
                let idTransactionExist =  null

                mapDataTransactionsUsers.forEach((find, findIndex) => {
                    if(find.id === value1.id){
                        idTransactionExist = findIndex
                    }
                })

                if(idTransactionExist !== null){
                    mapDataTransactionsUsers[idTransactionExist].detail_transaction.push({
                        product_id: value1.product_id,
                        variant_product_id: value1.variant_product_id,
                        brand_name: value1.brands_name,
                        product_name: value1.product_name,
                        product_price: value1.product_price,
                        qty: value1.qty,
                        total_product: value1.qty * value1.product_price,
                        image_product: value1.image_product,
                        gudang_id: value1.gudang_id
                    })
                    mapDataTransactionsUsers[idTransactionExist].detail_transaction_to_update.push({
                        qty: value1.qty,
                        gudang_id: value1.gudang_id,
                        variant_product_id: value1.variant_product_id
                    })
                }else{
                    mapDataTransactionsUsers.push({
                        id: value1.id,
                        shipping_address: value1.shipping_to,
                        transaction_date: value1.transaction_date,
                        created_at: value1.created_at,
                        expired_at: value1.expired_at,
                        status: value1.status,
                        is_done: value1.is_done,
                        shipping_rates: value1.shipping_rates,
                        total: Number(value1.total_amount),
                        detail_transaction: [
                            {
                                product_id: value1.product_id,
                                variant_product_id: value1.variant_product_id,
                                brand_name: value1.brands_name,
                                product_name: value1.product_name,
                                product_price: value1.product_price,
                                qty: value1.qty,
                                total_product: value1.qty * value1.product_price,
                                image_product: value1.image_product,
                                gudang_id: value1.gudang_id
                            }
                        ],
                        detail_transaction_to_update: [
                            {
                                qty: value1.qty,
                                gudang_id: value1.gudang_id,
                                variant_product_id: value1.variant_product_id
                            }
                        ],
                        history_transaction: []
                    })
                }
            })

            dataHistoryTransactionsUsers.forEach((value1, index1) => {
                let idTransactionExist =  null

                mapDataTransactionsUsers.forEach((find, findIndex) => {
                    if(find.id === value1.id){
                        idTransactionExist = findIndex
                    }
                })

                if(idTransactionExist !== null){
                    mapDataTransactionsUsers[idTransactionExist].history_transaction.push({
                        transaction_date: value1.transaction_date,
                        status_name: value1.status_name,
                        is_done: value1.is_done
                    })
                }
            })
            console.log(mapDataTransactionsUsers)
            res.send({
                error: false,
                message: 'Get Data Transactions Users Success',
                mapDataTransactionsUsers
            })
        } catch (error) {
            console.log(error)
            res.send({
                error: true,
                message: error.message
            })
        }
    },

    onExpiredTransaction: (req, res) => {
        let data1 = req.body[0] // Data To Update Status Transaction
        let data2 = req.body[1] // Data To Update Stock

        db.beginTransaction((err) => {
            Promise.all(data2.map((value, index) => {
                var promise = new Promise((resolve, reject) => {
                    db.query('UPDATE stock SET stock_customer = stock_customer + ? WHERE gudang_id = ? AND variant_product_id = ?', [data2[index].qty, data2[index].gudang_id, data2[index].variant_product_id], (err, result) => {
                        try {
                            if(err){ 
                                return db.rollback(() => {
                                    throw err
                                })
                            }
                            
                        } catch (error) {
                            res.send({
                                error: true,
                                message: error.message
                            })
                        }
                    })
                })
            })).then((response) => {
                var sqlQuery1 = `UPDATE status_transaction SET is_done = 3 WHERE transaction_id = ? AND status_name_id = 1`
                db.query(sqlQuery1, data1, (err, resultSqlQuery1) => {
                    try {
                        console.log(resultSqlQuery1)
                        db.commit((err) => {
                            if(err){ 
                                return db.rollback(() => {
                                    throw err
                                })
                            }
                            
                            res.send({
                                error: false, 
                                message: 'Transaction ' + data1 + ' Has Been Expired'
                            })
                        })
                    } catch (error) {
                        res.send({
                            error: true,
                            message : error.message
                        })
                    }
                })

            }).catch((error) => {
                res.send({
                    error: true,
                    message: error.message
                })
            })
        })
    },

    confirmMyTransaction: async (req, res) => {
        const users_id = req.dataToken.id
        const data = {
            transaction_id: req.body.transaction_id,
            status_name_id: req.body.status_name_id,
            is_done: req.body.is_done
        }
   

        let updateStatusTransactionQuery = `INSERT INTO status_transaction SET ?`
        let updateLastStatusTransactionQuery = `UPDATE status_transaction SET is_done = 1 WHERE transaction_id = ? AND status_name_id = 3`
        let getTransactionsQuery = `SELECT t.id, p.id AS product_id, td.variant_product_id, b.brands_name, td.product_name, td.product_price, td.qty, 
        g.id AS gudang_id, td.url AS image_product, td.shipping_address, st.date AS transaction_date,
        st.status_name_id, sn.name AS status, u.id AS users_id FROM transaction_detail td
        JOIN variant_product vp ON td.variant_product_id = vp.id
        JOIN products p ON vp.products_id = p.id
        JOIN brands b ON p.brands_id = b.id
        JOIN transaction t ON td.transaction_id = t.id
        JOIN status_transaction st ON td.transaction_id = st.transaction_id
        JOIN status_name sn ON st.status_name_id = sn.id
        JOIN gudang g ON td.gudang_id = g.id
        JOIN users u ON t.users_id = u.id
        WHERE u.id = ? AND st.status_name_id = 3 AND st.is_done = 1`

        let getHistoryTransactionsQuery = `SELECT st.date AS transaction_date, sn.name AS status_name FROM status_transaction st
        JOIN transaction t ON st.transaction_id = t.id
        JOIN users u ON t.users_id = u.id
        JOIN status_name sn ON st.status_name_id = sn.id
        WHERE u.id = ?`

        try {
            await query('Start Transaction')

            let updateStatusTransaction = await query(updateStatusTransactionQuery, data)
            console.log(updateStatusTransaction)
   

            let updateLastStatusTransaction = await query(updateLastStatusTransactionQuery, data.transaction_id)
            .catch(error => {
                throw error
            })

            let dataTransactionsUsers = await query(getTransactionsQuery, users_id)
            let dataHistoryTransactionsUsers = await query(getHistoryTransactionsQuery, users_id)

            let mapDataTransactionsUsers = []

            dataTransactionsUsers.forEach((value1, index1) => {
                let idTransactionExist =  null

                mapDataTransactionsUsers.forEach((find, findIndex) => {
                    if(find.id === value1.id){
                        idTransactionExist = findIndex
                    }
                })

                if(idTransactionExist !== null){
                    mapDataTransactionsUsers[idTransactionExist].total += value1.qty * value1.product_price
                    mapDataTransactionsUsers[idTransactionExist].detail_transaction.push({
                        product_id: value1.product_id,
                        variant_product_id: value1.variant_product_id,
                        brand_name: value1.brands_name,
                        product_name: value1.product_name,
                        product_price: value1.product_price,
                        qty: value1.qty,
                        total_product: value1.qty * value1.product_price,
                        image_product: value1.image_product,
                        gudang_id: value1.gudang_id
                    })
                }else{
                    mapDataTransactionsUsers.push({
                        id: value1.id,
                        shipping_address: value1.shipping_address,
                        transaction_date: value1.transaction_date,
                        status: value1.status,
                        total: value1.qty * value1.product_price,
                        detail_transaction: [
                            {
                                product_id: value1.product_id,
                                variant_product_id: value1.variant_product_id,
                                brand_name: value1.brands_name,
                                product_name: value1.product_name,
                                product_price: value1.product_price,
                                qty: value1.qty,
                                total_product: value1.qty * value1.product_price,
                                image_product: value1.image_product,
                                gudang_id: value1.gudang_id
                            }
                        ]
                    })
                }
            })

            await query("Commit");

            res.send({
                error: false,
                message: 'Get Data Transactions Users Success',
                mapDataTransactionsUsers,
                dataHistoryTransactionsUsers
            })
        } catch (error) {
            await query('Rollback');
            console.log('Rollback');
            console.log(error)
            console.log(error)
        }
    },

    getUserShippingAddress: (req, res) => {
        const users_id = req.dataToken.id

        var sqlQuery = 'SELECT * FROM shipping_address WHERE users_id = ? ORDER BY is_main_address DESC'
        db.query(sqlQuery, users_id, (err, result) => {
            try {
                if(err) throw err
                
                res.send({
                    error: false,
                    message: 'Get Users Shipping Address Success',
                    data: result
                })
            } catch (error) {
                res.send({
                    error: true,
                    message : error.message
                })
            }
        })
    },

    addShippingAddress: async (req, res) => {
        const users_id = req.dataToken.id
        
        const data = {
            address_detail: req.body.address_detail,
            city: req.body.city,
            province: req.body.province,
            phone_number: req.body.phone_number,
            receiver_name: req.body.receiver_name,
            users_id: users_id,
            longUser: req.body.longUser,
            latUser: req.body.latUser,
            is_main_address: req.body.is_main_address,
            province_id: req.body.province_id,
            city_id: req.body.city_id,
            nearest_place: req.body.nearest_place
        }
       
        try {
            if(!data.address_detail || !data.city || !data.province || !data.phone_number || !data.receiver_name || !data.users_id || !data.longUser || !data.latUser ) throw { message: 'Data Must Be Filled' }

                if(data.is_main_address === 1){
                    let findMainAddressQuery = 'SELECT * FROM shipping_address WHERE is_main_address = 1 and users_id = ?'
                    const findMainAddress = await query(findMainAddressQuery, data.users_id)
    
                    if(findMainAddress.length === 1){
                        db.beginTransaction((err) => {
                            if(err) throw err 
    
                            var sqlQuery1 = 'UPDATE shipping_address SET is_main_address = 0 WHERE id = ?'
                            db.query(sqlQuery1, findMainAddress[0].id, (err, resultSqlQuery1) => {
                                try {
                                    if(err){ 
                                        return db.rollback(() => {
                                            throw err
                                        })
                                    }
    
                                    var sqlQuery2 = 'INSERT INTO shipping_address SET ?'
                                    db.query(sqlQuery2, data, (err, resultSqlQuery2) => {
                                        try {
                                            if(err){ 
                                                return db.rollback(() => {
                                                    throw err
                                                })
                                            }
                                            
                                            var sqlQuery3 = 'SELECT * FROM shipping_address WHERE users_id = ? ORDER BY is_main_address DESC'
                                            db.query(sqlQuery3, data.users_id, (err, resultSqlQuery3) => {
                                                try {
                                                    if(err){ 
                                                        return db.rollback(() => {
                                                            throw err
                                                        })
                                                    }
                                                    
                                                    db.commit((err) => {
                                                        if(err){ 
                                                            return db.rollback(() => {
                                                                throw err
                                                            })
                                                        }
                                                        
                                                        res.send({
                                                            error: false, 
                                                            message: 'Add Shipping Address Success',
                                                            data: resultSqlQuery3
                                                        })
                                                    })
                                                } catch (error) {
                                                    console.log(error)
                                                    // res.send({
                                                    //     error: true,
                                                    //     message : error.message
                                                    // })
                                                }
                                            })
                                        } catch (error) {
                                            console.log(error)
                                            // res.send({
                                            //     error: true,
                                            //     message : error.message
                                            // })
                                        }
                                    })
                                } catch (error) {
                                    console.log(error)
                                    // res.send({
                                    //     error: true,
                                    //     message : error.message
                                    // })
                                }
                            })
                        })  
                    }else{
                        var sqlQuery2 = 'INSERT INTO shipping_address SET ?'
                        db.query(sqlQuery2, data, (err, resultSqlQuery2) => {
                            try {
                                if(err) throw err
                                
                                var sqlQuery3 = 'SELECT * FROM shipping_address WHERE users_id = ? ORDER BY is_main_address DESC'
                                db.query(sqlQuery3, data.users_id, (err, resultSqlQuery3) => {
                                    try {
                                        if(err) throw err

                                        res.send({
                                            error: false, 
                                            message: 'Add Shipping Address Success',
                                            data: resultSqlQuery3
                                        })
                                    } catch (error) {
                                        console.log(error)
                                        // res.send({
                                        //     error: true,
                                        //     message : error.message
                                        // })
                                    }
                                })
                            } catch (error) {
                                console.log(error)
                                // res.send({
                                //     error: true,
                                //     message : error.message
                                // })
                            }
                        })
                    }
                }else{
                    var sqlQuery4 = 'INSERT INTO shipping_address SET ?'
                    db.query(sqlQuery4, data, (err, resultSqlQuery4) => {
                        try {
                            if(err) throw err
                            
                            var sqlQuery5 = 'SELECT * FROM shipping_address WHERE users_id = ? ORDER BY is_main_address DESC'
                            db.query(sqlQuery5, data.users_id, (err, resultSqlQuery5) => {
                                try {
                                    if(err) throw err

                                    res.send({
                                        error: false, 
                                        message: 'Add Shipping Address Success',
                                        data: resultSqlQuery5
                                    })
                                } catch (error) {
                                    console.log(error)
                                    // res.send({
                                    //     error: true,
                                    //     message : error.message
                                    // })
                                }
                            })
                        } catch (error) {
                            console.log(error)
                            // res.send({
                            //     error: true,
                            //     message : error.message
                            // })
                        }
                    })
                }
        } catch (error) {
            console.log(error)
            // res.send({
            //     error: true,
            //     message : error.message
            // })
        }
    },

    getUsersShippingAddressToEdit: (req, res) => {
        const data = req.body
        
        var sqlQuery = 'SELECT * FROM shipping_address WHERE id = ?'
        db.query(sqlQuery, data.id, (err, result) => {
            try {
                if(err) throw err
                
                res.send({
                    error: false,
                    message: 'Get Users Shipping Address To Edit Success',
                    data: result
                })
            } catch (error) {
                res.send({
                    error: true,
                    message : error.message
                })
            }
        })
    },

    updateUsersShippingAddress: async (req, res) => {
        const data = req.body
        console.log(data.is_main_address)
       
        try {
            if(!data.address_detail || !data.city || !data.province || !data.phone_number || !data.receiver_name || !data.users_id || !data.longitude || !data.latitude ) throw { message: 'Data Must Be Filled' }

                if(data.is_main_address === 1){
                    let findMainAddressQuery = 'SELECT * FROM shipping_address WHERE is_main_address = 1'
                    const findMainAddress = await query(findMainAddressQuery)
    
                    if(findMainAddress.length === 1){
                        db.beginTransaction((err) => {
                            if(err) throw err 
    
                            var sqlQuery1 = 'UPDATE shipping_address SET is_main_address = 0 WHERE id = ?'
                            db.query(sqlQuery1, findMainAddress[0].id, (err, resultSqlQuery1) => {
                                try {
                                    if(err){ 
                                        return db.rollback(() => {
                                            throw err
                                        })
                                    }
    
                                    var sqlQuery2 = 'UPDATE shipping_address SET address_detail = ?, city = ?, province = ?, phone_number = ?, receiver_name = ?, users_id = ?, is_main_address = ?, province_id = ?, city_id = ?, nearest_place = ? WHERE id = ?'
                                    db.query(sqlQuery2, [data.address_detail, data.city, data.province, data.phone_number, data.receiver_name, data.users_id, data.is_main_address, data.province_id, data.city_id, data.nearest_place, data.id], (err, resultSqlQuery2) => {
                                        try {
                                            if(err){ 
                                                return db.rollback(() => {
                                                    throw err
                                                })
                                            }

                                            var sqlQuery3 = 'SELECT * FROM shipping_address WHERE users_id = ? ORDER BY is_main_address DESC'
                                            db.query(sqlQuery3, data.users_id, (err, resultSqlQuery3) => {
                                                try {
                                                    if(err){ 
                                                        return db.rollback(() => {
                                                            throw err
                                                        })
                                                    }

                                                    db.commit((err) => {
                                                        if(err){ 
                                                            return db.rollback(() => {
                                                                throw err
                                                            })
                                                        }
                                                        
                                                        res.send({
                                                            error: false, 
                                                            message: 'Edit Shipping Address Success',
                                                            data: resultSqlQuery3
                                                        })
                                                    })
                                                } catch (error) {
                                                    console.log(error)
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
                                } catch (error) {
                                    res.send({
                                        error: true,
                                        message : error.message
                                    })
                                }
                            })
                        })  
                    }else{
                        var sqlQuery4 = `UPDATE shipping_address SET address_detail = ?, city = ?, province = ?, phone_number = ?, receiver_name = ?, users_id = ?, is_main_address = ?, province_id = ?, city_id = ?, nearest_place = ? WHERE id = ?`
                        db.query(sqlQuery4, [data.address_detail, data.city, data.province, data.phone_number, data.receiver_name, data.users_id, data.is_main_address, data.province_id, data.city_id, data.nearest_place, data.id], (err, resultQuery4) => {
                            try {
                                if(err) throw err

                                var sqlQuery5 = 'SELECT * FROM shipping_address WHERE users_id = ? ORDER BY is_main_address DESC'
                                db.query(sqlQuery5, data.users_id, (err, resultSqlQuery5) => {
                                    try {
                                        if(err) throw err

                                        res.send({
                                            error: false, 
                                            message: 'Edit Shipping Address Success',
                                            data: resultSqlQuery5
                                        })
                                    } catch (error) {
                                        console.log(error)
                                        res.send({
                                            error: true,
                                            message : error.message
                                        })
                                    }
                                })
                            } catch (error) {
                                console.log(error)
                                res.json({
                                    error : true, 
                                    message : error.message
                                })
                            }
                        })
                    }
                }else{
                    var sqlQuery6 = `UPDATE shipping_address SET address_detail = ?, city = ?, province = ?, phone_number = ?, receiver_name = ?, users_id = ?, is_main_address = ?, province_id = ?, city_id = ?, nearest_place = ? WHERE id = ?`
                    db.query(sqlQuery6, [data.address_detail, data.city, data.province, data.phone_number, data.receiver_name, data.users_id, data.is_main_address, data.province_id, data.city_id, data.nearest_place, data.id], (err, resultQuery6) => {
                        try {
                            if(err) throw err

                            var sqlQuery7 = 'SELECT * FROM shipping_address WHERE users_id = ? ORDER BY is_main_address DESC'
                            db.query(sqlQuery7, data.users_id, (err, resultSqlQuery7) => {
                                try {
                                    if(err) throw err

                                    res.send({
                                        error: false, 
                                        message: 'Edit Shipping Address Success',
                                        data: resultSqlQuery7
                                    })
                                } catch (error) {
                                    console.log(error)
                                    res.send({
                                        error: true,
                                        message : error.message
                                    })
                                }
                            })
                        } catch (error) {
                            console.log(error)
                            res.json({
                                error : true, 
                                message : error.message
                            })
                        }
                    })
                }
        } catch (error) {
            res.send({
                error: true,
                message : error.message
            })
        }
    },

    deleteUsersShippingAddress: (req, res) => {
        const token = req.params.token
        const address_id = Number(req.params.idAddress)

        jwt.verify(token, '123abc', (err, dataToken) => {
            var sqlQuery = 'DELETE FROM shipping_address WHERE id = ? AND users_id = ?;'
            db.query(sqlQuery, [address_id, dataToken.id], (err, result) => {
                try {
                    if (err) throw err
    
                    var sqlQuery1 = 'SELECT * FROM shipping_address WHERE users_id = ? ORDER BY is_main_address DESC'
                    db.query(sqlQuery1, dataToken.id, (err, resultQuery1) => {
                        try {
                            if(err) throw err
                            
                            res.json({
                                error : false, 
                                message : 'Delete Shipping Address Success',
                                data: resultQuery1
                            })
                        } catch (error) {
                            res.send({
                                error: true,
                                message : error.message
                            })
                        }
                    })
                } catch (error) {
                    res.json({
                        error : true,
                        message : error.message,
                        detail : error
                    })
                }
            })
        })
    },

    getRajaOngkirProvince: (req, res) => {
        Axios.get('https://api.rajaongkir.com/starter/province?key=598395fbbd5364b73d2c50d57df09682')
        .then((response) => {
            res.send({
                error: false, 
                message: 'Get Raja Ongkir Province Success',
                data: response.data
            })
        })
        .catch((err) => {
            console.log(err)
        })  
    },
    

    getRajaOngkirCity: (req, res) => {
        Axios.get('https://api.rajaongkir.com/starter/city?key=598395fbbd5364b73d2c50d57df09682')
        .then((response) => {
            res.send({
                error: false, 
                message: 'Get Raja Ongkir City Success',
                data: response.data
            })
        })
        .catch((err) => {
            console.log(err)
        })  
    },

    getDataStatistic: async (req, res) => {
        let getTransactionsSuccessQuery = `SELECT COUNT(*) AS transactions_success FROM status_transaction WHERE status_name_id = 4 AND is_done = 0`

        let getTransactionsPendingQuery = `SELECT COUNT(*) AS transactions_pending FROM status_transaction WHERE status_name_id != 4 AND is_done = 0`

        let getActiveUsersQuery = `SELECT count(DISTINCT users_id) AS active_user FROM transaction`

        let getPassiveUsersQuery = `SELECT COUNT(*) AS passive_user FROM users WHERE id NOT IN
        (SELECT users_id FROM transaction)`

        let getIncomeSuccessQuery = `SELECT sum(product_price*qty) AS total_income_success FROM transaction_detail td
        JOIN transaction t ON td.transaction_id = t.id
        JOIN variant_product vp ON td.variant_product_id = vp.id
        JOIN status_transaction st ON t.id = st.transaction_id
        WHERE status_name_id = 4`

        let getIncomePendingQuery = `SELECT sum(product_price*qty) AS total_income_pending FROM transaction_detail td
        JOIN transaction t ON td.transaction_id = t.id
        JOIN variant_product vp ON td.variant_product_id = vp.id
        JOIN status_transaction st ON t.id = st.transaction_id
        WHERE status_name_id != 4 AND is_done = 0`

        try {
            let getTransactionsSuccess = await query(getTransactionsSuccessQuery)
            let getTransactionsPending = await query(getTransactionsPendingQuery)
            let getActiveUsers = await query(getActiveUsersQuery)
            let getPassiveUsers = await query(getPassiveUsersQuery)
            let getIncomeSuccess = await query(getIncomeSuccessQuery)
            let getIncomePending = await query(getIncomePendingQuery)

            res.send({
                error: false,
                message: 'Get Data Statistic Success',
                getTransactionsSuccess,
                getTransactionsPending,
                getActiveUsers,
                getPassiveUsers,
                getIncomeSuccess,
                getIncomePending
            })
        } catch (error) {
            res.send({
                error: true,
                message: error.message
            })
        }
    },

    getUsersTransactions: (req, res) => {
        const data = req.body

        var sqlQuery1 = `SELECT t.id, p.id AS product_id, td.variant_product_id, b.brands_name, td.product_name, td.product_price, td.qty, 
        g.id AS gudang_id, td.url AS image_product, td.shipping_address, st.date AS transaction_date,
        st.status_name_id, sn.name AS status FROM transaction_detail td
        JOIN variant_product vp ON td.variant_product_id = vp.id
        JOIN products p ON vp.products_id = p.id
        JOIN brands b ON p.brands_id = b.id
        JOIN transaction t ON td.transaction_id = t.id
        JOIN status_transaction st ON td.transaction_id = st.transaction_id
        JOIN status_name sn ON st.status_name_id = sn.id
        JOIN gudang g ON td.gudang_id = g.id
        WHERE st.status_name_id = ? AND st.is_done = 0`
        db.query(sqlQuery1, data.status_name_id, (err, resultQuery1) => {
            try {
                if(err) throw err

                let mapResultQuery1 = []

                resultQuery1.forEach((value1, index1) => {
                    let idTransactionExist =  null

                    mapResultQuery1.forEach((find, findIndex) => {
                        if(find.id === value1.id){
                            idTransactionExist = findIndex
                        }
                    })

                    if(idTransactionExist !== null){
                        mapResultQuery1[idTransactionExist].total += value1.qty * value1.product_price
                        mapResultQuery1[idTransactionExist].detail_transaction.push({
                            product_id: value1.product_id,
                            variant_product_id: value1.variant_product_id,
                            brand_name: value1.brands_name,
                            product_name: value1.product_name,
                            product_price: value1.product_price,
                            qty: value1.qty,
                            total_product: value1.qty * value1.product_price,
                            image_product: value1.image_product,
                            gudang_id: value1.gudang_id
                        })
                        mapResultQuery1[idTransactionExist].detail_transaction_to_update.push({
                            qty: value1.qty,
                            gudang_id: value1.gudang_id,
                            variant_product_id: value1.variant_product_id
                        })
                    }else{
                        mapResultQuery1.push({
                            id: value1.id,
                            shipping_address: value1.shipping_address,
                            transaction_date: value1.transaction_date,
                            status: value1.status,
                            total: value1.qty * value1.product_price,
                            detail_transaction: [
                                {
                                    product_id: value1.product_id,
                                    variant_product_id: value1.variant_product_id,
                                    brand_name: value1.brands_name,
                                    product_name: value1.product_name,
                                    product_price: value1.product_price,
                                    qty: value1.qty,
                                    total_product: value1.qty * value1.product_price,
                                    image_product: value1.image_product,
                                    gudang_id: value1.gudang_id
                                }
                            ],
                            detail_transaction_to_update: [
                                {
                                    qty: value1.qty,
                                    gudang_id: value1.gudang_id,
                                    variant_product_id: value1.variant_product_id
                                }
                            ]
                        })
                    }
                })

                res.send({
                    error: false,
                    message: 'Get Users Transactions Success',
                    data: mapResultQuery1
                })
            } catch (error) {
                res.send({
                    error: true,
                    message : error.message
                })
            }
        })
    },

    deliverProductsToCustomer: (req, res) => {
        let data1 = req.body[0] // Data To Update Status Transaction
        let newData1 = [
            {
                transaction_id: data1, 
                status_name_id: 3,
                is_done: 0
            }
        ]
        let data2 = req.body[1] // Data To Update Stock

        db.beginTransaction((err) => {
            Promise.all(data2.map((value, index) => {
                var promise = new Promise((resolve, reject) => {
                    db.query('UPDATE stock SET stock_gudang = stock_gudang - ? WHERE gudang_id = ? AND variant_product_id = ?', [data2[index].qty, data2[index].gudang_id, data2[index].variant_product_id], (err, result) => {
                        try {
                            if(err){ 
                                return db.rollback(() => {
                                    throw err
                                })
                            }
                            
                        } catch (error) {
                            res.send({
                                error: true,
                                message: error.message
                            })
                        }
                    })
                })
            })).then((response) => {
                var sqlQuery1 = `INSERT INTO status_transaction SET ?`
                db.query(sqlQuery1, newData1, (err, resultSqlQuery1) => {
                    try {
                        if(err){ 
                            return db.rollback(() => {
                                throw err
                            })
                        }

                        var sqlQuery2 = `UPDATE status_transaction SET is_done = 1 WHERE transaction_id = ? AND status_name_id = 2`
                            db.query(sqlQuery2, data1, (err, resultSqlQuery2) => {
                                if(err){ 
                                    return db.rollback(() => {
                                        throw err
                                    })
                                }

                                var sqlQuery3 = `SELECT t.id, p.id AS product_id, td.variant_product_id, b.brands_name, td.product_name, td.product_price, td.qty, 
                                g.id AS gudang_id, td.url AS image_product, td.shipping_address, st.date AS transaction_date,
                                st.status_name_id, sn.name AS status FROM transaction_detail td
                                JOIN variant_product vp ON td.variant_product_id = vp.id
                                JOIN products p ON vp.products_id = p.id
                                JOIN brands b ON p.brands_id = b.id
                                JOIN transaction t ON td.transaction_id = t.id
                                JOIN status_transaction st ON td.transaction_id = st.transaction_id
                                JOIN status_name sn ON st.status_name_id = sn.id
                                JOIN gudang g ON td.gudang_id = g.id
                                WHERE st.status_name_id = 2 AND st.is_done = 0`
                                db.query(sqlQuery3, (err, resultQuery3) => {
                                    try {
                                        if(err) throw err

                                        let mapResultQuery3 = []

                                        resultQuery3.forEach((value1, index1) => {
                                            let idTransactionExist =  null

                                            mapResultQuery3.forEach((find, findIndex) => {
                                                if(find.id === value1.id){
                                                    idTransactionExist = findIndex
                                                }
                                            })

                                            if(idTransactionExist !== null){
                                                mapResultQuery3[idTransactionExist].total += value1.qty * value1.product_price
                                                mapResultQuery3[idTransactionExist].detail_transaction.push({
                                                    product_id: value1.product_id,
                                                    variant_product_id: value1.variant_product_id,
                                                    brand_name: value1.brands_name,
                                                    product_name: value1.product_name,
                                                    product_price: value1.product_price,
                                                    qty: value1.qty,
                                                    total_product: value1.qty * value1.product_price,
                                                    image_product: value1.image_product,
                                                    gudang_id: value1.gudang_id
                                                })
                                                mapResultQuery3[idTransactionExist].detail_transaction_to_update.push({
                                                    qty: value1.qty,
                                                    gudang_id: value1.gudang_id,
                                                    variant_product_id: value1.variant_product_id
                                                })
                                            }else{
                                                mapResultQuery3.push({
                                                    id: value1.id,
                                                    shipping_address: value1.shipping_address,
                                                    transaction_date: value1.transaction_date,
                                                    status: value1.status,
                                                    total: value1.qty * value1.product_price,
                                                    detail_transaction: [
                                                        {
                                                            product_id: value1.product_id,
                                                            variant_product_id: value1.variant_product_id,
                                                            brand_name: value1.brands_name,
                                                            product_name: value1.product_name,
                                                            product_price: value1.product_price,
                                                            qty: value1.qty,
                                                            total_product: value1.qty * value1.product_price,
                                                            image_product: value1.image_product,
                                                            gudang_id: value1.gudang_id
                                                        }
                                                    ],
                                                    detail_transaction_to_update: [
                                                        {
                                                            qty: value1.qty,
                                                            gudang_id: value1.gudang_id,
                                                            variant_product_id: value1.variant_product_id
                                                        }
                                                    ]
                                                })
                                            }
                                        })

                                        
                                        db.commit((err) => {
                                            if(err){ 
                                                return db.rollback(() => {
                                                    throw err
                                                })
                                            }
                                            
                                            res.send({
                                                error: false, 
                                                message: 'Product Delivered To Customer',
                                                data: mapResultQuery3
                                            })
                                        })
                                    } catch (error) {
                                        res.send({
                                            error: true,
                                            message : error.message
                                        })
                                    }
                                })
                        })
                    } catch (error) {
                        res.send({
                            error: true,
                            message : error.message
                        })
                    }
                })

            }).catch((error) => {
                res.send({
                    error: true,
                    message: error.message
                })
            })
        })
    },

    getWarehouseInventory: (req, res) => {
        const data = req.body

        var sqlQuery = `SELECT p.id AS product_id, vp.id AS variant_product_id, p.name, ps.size, vp.price, s.stock_customer, s.stock_gudang, g.gudang_name FROM variant_product vp
        JOIN products p ON vp.products_id = p.id
        JOIN product_size ps ON vp.product_size_id = ps.id
        JOIN stock s ON vp.id = s.variant_product_id
        JOIN gudang g ON s.gudang_id = g.id ORDER BY p.id ASC;`
        db.query(sqlQuery, (err, result) => {
            try {
                if(err) throw err
                
                res.send({
                    error: false,
                    message: 'Get Warehouse Inventory Success',
                    data: result
                })
            } catch (error) {
                res.send({
                    error: true,
                    message : error.message
                })
            }
        })
    },

    getDiscountProducts: (req, res) => {
        var sqlQuery = 'SELECT * FROM products WHERE discount > 0'
        db.query(sqlQuery, (err, result) => {
            try {
                if(err) throw err

                res.send({
                    error: false,
                    message: 'Get Discount Products Success',
                    data: result
                })
            } catch (error) {
                res.send({
                    error: true,
                    message : error.message
                })
            }
        })
    }, 
    
    createFlashSaleEvent: (req, res) => {
        const data = req.body
        const eventName = String(data.eventDate).split(' ')[0].replace(/-/g, '_')

        var sqlQuery1 = `CREATE EVENT flash_sale_event_${eventName}
        ON SCHEDULE AT '${data.eventDate} 13:45:00'
        DO
            UPDATE products SET is_flash_sale = 1, expired_flash_sale = '${data.eventDate} 13:45:00' + INTERVAL 5 MINUTE WHERE id IN (${data.products_id});`
        
        db.query(sqlQuery1, (err, resultQuery1) => {
            try {
                if(err) throw err

                var sqlQuery2 = `CREATE EVENT flash_sale_event_ended_${eventName}
                ON SCHEDULE AT '${data.eventDate} 13:45:00' + INTERVAL 5 MINUTE
                DO
                    UPDATE products SET is_flash_sale = 0, expired_flash_sale = null WHERE expired_flash_sale = '${data.eventDate} 13:45:00' + INTERVAL 5 MINUTE;`
                
                db.query(sqlQuery2, (err, resultQuery2) => {
                    try {
                        if(err) throw err

                        var sqlQuery3 = 'SELECT * FROM products WHERE discount > 0'
                        db.query(sqlQuery3, (err, resultQuery3) => {
                            try {
                                if(err) throw err

                                res.send({
                                    error: false,
                                    message: 'Create Flash Sale Event Success',
                                    data: resultQuery3
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
            } catch (error) {
                res.send({
                    error: true,
                    message : error.message
                })
            }
        })
    },
    updateShippingaddress : async (req, res) => {
        let {id} = req.body
        let users_id = req.dataToken.id

        console.log(users_id, id)

        const updateShippingAddresAll = 'update shipping_address set is_main_address = 0 where users_id = ?'
        const updateShippingSelected = 'update shipping_address set is_main_address = 1 where id = ?'

        try {
            if(!users_id || !id) throw 'Data not complete'
            await query('START TRANSACTION')
            const resultQueryAll = await query(updateShippingAddresAll, users_id)
            .catch(error => {
                throw error
            })

            const resultQuerySelected = await query(updateShippingSelected, id)
            .catch(error => {
                throw error
            })
            await query("COMMIT");

            res.send({
                error : false,
                message : 'Update Success'
            })

        } catch (error) {
            await query("ROLLBACK");
            console.log('ROLLBACK gagal update shipping address');
            res.send({
                error: true,
                message : error
            })
        }
    }
}