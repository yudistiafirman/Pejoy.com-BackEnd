const categoryFilter = require('../helpers/filterCategory')
const buildConditions = require('../helpers/multipleFilter')
const { all } = require('../routers/productRouter')
const query = require('./../database/mysqlAsync')
const db = require('./../database/mysql')
const { default: Axios } = require('axios')
const sort = require('../helpers/Sort')
const fs = require('fs')
const handlebars = require('handlebars')
const moment = require('moment')
const transporter = require('../helpers/transporter')



const getAllProduct=async(req,res)=>{
        try {
            let allProducts = await query(`select p.id, sum(s.stock_customer) as stock_all_gudang , p.discount, pr.rating, 
            pr.id as review_id, p.is_flash_sale, group_concat(distinct(ip.url)) as url , p.name, c.category_name, c.id as category_id ,
            min(vp.price) as price, b.brands_name, b.id as brand_id from products p
            join variant_product vp on vp.products_id = p.id
            join brands b on b.id = p.brands_id
            join stock s on s.variant_product_id = vp.id
            join category c on c.id = p.category_id
            join image_product ip on ip.products_id = p.id
            left join product_review pr on pr.products_id = p.id
            group by p.id
            having stock_all_gudang > 0 `)
           
            res.send({
                success:true,
                products:allProducts
            })
        } catch (error) {
            res.send({
                success:false,
                error:error.message
            })
        }
}


const getFilter = async(req, res) => {
    let brandsQuery = 'select * from brands'
    let categoryQuery = 'select * from category;'
    let ratingQuery =`select rating from product_review group by rating order by rating;`
    let discountQuery = 'select discount from products group by discount order by discount;'

    try {
        let category = await query(categoryQuery)
        let brands = await query(brandsQuery)
        let rating = await query(ratingQuery)
        let discount = await query(discountQuery)


        res.send({
            error : false,
            category,
            brands,
            rating,
            discount
        })
        
    } catch (error) {
        res.send({
            error: true,
            message : error.message
        })
    }
}

const getProductByCategory = async(req, res) => {
    // id Category
    let filter = req.body
    let conditions = categoryFilter(filter)


    // let page = parseInt(req.query.page) 
    // let limit = parseInt(req.query.limit) 
    // let startIndex = (page - 1) * limit // 1 * 10 = 10
    // // let endIndex = page * limit // 2 * 10 = 20
    
    // let nextPage = {
    //     page : page + 1,
    //     limit : limit
    // }
    // const previousPage = {
    //     page : page - 1,
    //     limit : limit
    // }
    // // if(startIndex > 0){
        
    // // }

    let order = sort(req.query.sort)

    let getProductCategoryQuery = `select p.id, sum(s.stock_customer) as stock_all_gudang , p.discount, pr.rating, 
    pr.id as review_id, p.is_flash_sale, group_concat(distinct(ip.url)) as url , p.name, c.category_name, c.id as category_id ,
    min(vp.price) as price, b.brands_name, b.id as brand_id from products p
    join variant_product vp on vp.products_id = p.id
    join brands b on b.id = p.brands_id
    join stock s on s.variant_product_id = vp.id
    join category c on c.id = p.category_id
    join image_product ip on ip.products_id = p.id
    left join product_review pr on pr.products_id = p.id
    group by p.id
    having stock_all_gudang > 0 and ${conditions.where}
    ${order};`

    try {
        let filterCategory = await query(getProductCategoryQuery)
        console.log(filterCategory)
        res.send({
            error : false,
            filterCategory,
        })
    } catch (error) {
        res.send({
            error: true,
            message : error.message
        })
    }
}
const getProductByMultipleCategory = async(req, res) => {
    // id Category
    let filter = req.body
    
    let conditions = buildConditions(filter)
    let order = sort(req.query.sort)

  

    let getProductMultipleCategoryQuery = `select p.id, sum(s.stock_customer) as stock_all_gudang , p.discount, pr.rating, pr.id as review_id, p.is_flash_sale, group_concat(distinct(ip.url)) as url  ,p.name, c.category_name, c.id as category_id ,min(vp.price) as price, b.brands_name, b.id as brand_id from products p
    join variant_product vp on vp.products_id = p.id
    join brands b on b.id = p.brands_id
    join stock s on s.variant_product_id = vp.id
    join category c on c.id = p.category_id
    join image_product ip on ip.products_id = p.id
    left join product_review pr on pr.products_id = p.id
    group by p.id
    having stock_all_gudang > 0 and ${conditions.where}
    ${order};`

    try {
        let filterCategory = await query(getProductMultipleCategoryQuery)

        res.send({
            error : false,
            filterCategory
        })
    } catch (error) {
        res.send({
            error: true,
            message : error.message
        })
    }
}


const getProductDetail = async(req, res) => {
    let {id} = req.params



    let productByIdQuery = `select p.id, p.description, name, discount, is_flash_sale, brands_name from products p join brands b on b.id = p.brands_id where p.id = ?;`
    let productReviewQuery = `select pr.id, rating, review,pr.created_at, full_name from product_review pr
    join users u on u.id = pr.users_id
    join user_detail ud on ud.id = u.user_detail_id
    where products_id = ? order by created_at desc;`
    let productImageQuery = `select * from image_product where products_id = ?;`
    
    let sizeAndStockQuery = `select vp.id as variant_product_id, sum(s.stock_customer) as stock_customer,price, ps.size from variant_product vp 
    join stock s on s.variant_product_id = vp.id
    join product_size ps on ps.id = vp.product_size_id
    where products_id = ?
    group by vp.id;`

    
    try {
        const productInformation = await query(productByIdQuery, id)
        const productReview = await query(productReviewQuery, id)
        let avgRating = 0
        productReview.forEach((val, i) => {
            avgRating += val.rating
        })
        let avgRat = Math.floor(avgRating / productReview.length)

        const productImage = await query(productImageQuery, id)
        const productSize = await query(sizeAndStockQuery, id)
        console.log(productInformation)
        res.send({
            error : false,
            productInformation,
            productReview,
            avgRat,
            productImage,
            productSize
        })

    } catch (error) {
        res.send({
            error: true,
            message : error.message
        })
    }
}



const getCart = async(req, res) => {

    let users_id = req.dataToken.id

    let cartQuery = `select p.weight,c.variant_product_id, (p.weight * qty) as total_weight, sum(s.stock_customer) as stock, c.id, qty, price,(price * qty) as total_price, (price * (discount / 100)) as potongan,((price * (discount / 100)) * qty) as total_potongan , p.name, p.discount, p.is_flash_sale, b.brands_name, size, url from cart c
    join variant_product vp on vp.id = c.variant_product_id
    join products p on p.id = vp.products_id
    join brands b on b.id = p.brands_id
    join product_size ps on ps.id = vp.product_size_id
    join image_product ip on ip.products_id = p.id
    join stock s on s.variant_product_id = vp.id
    where c.users_id = ?
    group by c.id;`

    try {
        const cartData = await query(cartQuery, users_id)
        res.send({
            error : false,
            cartData
        })
        
    } catch (error) {
        res.send({
            error: true,
            message : error.message
        })
    }
}

const getEstimatedOngkir = (req, res) => {
    let data = req.body
    let users_id = req.dataToken.id
   
    db.query(`select id, address_detail, longUser, latUser, province_id, city_id from shipping_address
    where users_id = ${users_id} and is_main_address = 1`, (err, result) => {
        
        try {
            if(err) throw err
            if(result.length === 0) throw new Error('User belum memiliki alamat')
            let dataUser = result[0]
            db.query(`SELECT * , (3956 * 2 * ASIN(SQRT( POWER(SIN(( ${dataUser.latUser} - latGudang) *  pi()/180 / 2), 2) +COS( ${dataUser.latUser} * pi()/180) * COS(latGudang * pi()/180) * POWER(SIN(( ${dataUser.longUser} - longGudang) * pi()/180 / 2), 2) ))) as distance  
            from gudang  
            order by distance
            limit 1;`, (err, gudang) => {
               
                try {
                    if(err) throw err
                    let dataGudang = gudang[0]
                    console.log(dataGudang)
                    let query = {
                        key : '65fba3749b9a6449d0dd13fb2aee7f62',
                        origin: dataGudang.city_id, 
                        destination: dataUser.city_id, 
                        weight: data.weight, 
                        courier: data.courier
                    }
                
                    Axios.post('https://api.rajaongkir.com/starter/cost', query)
                    .then((respone) => {
                      
                        res.send({
                            error : false,
                            dataOngkir : respone.data.rajaongkir.results,
                            dataGudang : dataGudang,
                            dataUser : dataUser
                        })
                    })
                    .catch((err) => {
                        console.log(err)
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
    
}

const addCart = async(req, res) => {
    let data = req.body
    let users_id = req.dataToken.id

    let queryCheckUserId = `select * from users where id = ?`
    let queryInsertToDb = `insert into cart set ?`
    let queryGetDataCart = `select * from cart where users_id = ? and variant_product_id = ?;`
    let queryGetStockVariantProduct = `SELECT sum(stock_customer) as stock FROM stock where variant_product_id = ?;`
    let queryAddCart = `update cart set qty = ? where id = ?`

    try {
        if(!data.qty && !data.variant_product_id) throw new Error('Data not complete')
        await query('START TRANSACTION')
        const dataUser = await query(queryCheckUserId, users_id)
        .catch(error => {
            throw error
        })

        if(dataUser.length === 0) throw new Error('User not found')

        const dataStock = await query(queryGetStockVariantProduct, data.variant_product_id )
        .catch(error => {
            throw error
        })

        const dataCartByUser = await query(queryGetDataCart,[dataUser[0].id, data.variant_product_id] )
        .catch(error => {
            throw error
        })

        if(dataCartByUser.length === 0){
            if(data.qty > dataStock[0].stock) throw new Error('qty melebihi stock')
            let dataToInsert = {
                users_id : dataUser[0].id,
                variant_product_id : data.variant_product_id,
                qty : data.qty
            }
            const result = await query(queryInsertToDb, dataToInsert)
            .catch(error => {
                throw error
            })
        }else{
            if(data.qty > (dataStock[0].stock) - dataCartByUser[0].qty)throw new Error('qty melebihi stock')
            const resultUpdate = await query(queryAddCart, [(dataCartByUser[0].qty + data.qty), dataCartByUser[0].id])
            .catch(error => {
                throw error
            })
        }

        await query("COMMIT");

        res.send({
            error : false,
            message : 'Add to Cart Succes'
        })

    } catch (error) {
        await query("ROLLBACK");
        console.log('ROLLBACK gagal insert');
        res.send({
            error: true,
            message : error.message
        })
    }
}
const deleteCart = (req, res) => {
    let id = req.params.id
    try {
        if(!id) throw new Error('Data not complete')
        db.query('select * from cart where id = ?', id, (err, result) => {
            try {
                if(err) throw err
                db.query('delete from cart where id = ?', result[0].id, (err, result) => {
                    try {
                        if(err) throw err
                        res.send({
                            error : false,
                            message : 'Delete succes'
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
}

const updateQty = async(req, res) => {
    let data = req.body
    let users_id = req.dataToken.id

    let queryGetStockVariantProduct = `SELECT sum(stock_customer) as stock FROM stock where variant_product_id = ?;`
    let queryGetDataCart = `select * from cart where users_id = ? and variant_product_id = ?;`
    let queryUpdateStock = `update cart set qty = ? where id = ?`

    try {
        if(!data.id && !data.qty && !data.variant_product_id) throw new Error('Data not complete')
        await query('START TRANSACTION')
        const dataStock = await query(queryGetStockVariantProduct, data.variant_product_id )
        .catch(error => {
            throw error
        })

        const dataCartByUser = await query(queryGetDataCart,[users_id, data.variant_product_id] )
        .catch(error => {
            throw error
        })

        let stockByVariant = 0
        let qtySaatIni = 0
        dataCartByUser.forEach((val, i) => {
            stockByVariant += val.qty
            if(val.id === data.id){
                qtySaatIni += val.qty
            }
        })

        if(data.qty > (dataStock[0].stock - (stockByVariant - qtySaatIni))) throw new Error('qty melebihi stock')

        const resultUpdate = await query(queryUpdateStock,[data.qty, data.id])
        .catch(error => {
            throw error
        })
        await query("COMMIT");

        res.send({
            error : false,
            message : 'Update qty Succes'
        })

        
    } catch (error) {
        await query("ROLLBACK");
        console.log('ROLLBACK gagal update');
        res.send({
            error: true,
            message : error.message
        })
    }
}

const addTransaction = async (req, res) => {
    
    let data = req.body
    let users_id = req.dataToken.id

    // check users id
    let queryCheckUserIdQuery = `select * from users where id = ?`

    // get latitude and longitude shipping addres user
    let getLatAndLangUser = `select id, longUser, latUser, province_id, city_id from shipping_address
    where users_id = ? and is_main_address = 1`

    // check stock varian in cart available or not
    let checkStockQuery = `select SUM(s.stock_customer) as stock, qty, c.id, c.variant_product_id from cart c
    join stock s on s.variant_product_id = c.variant_product_id
    where users_id = ?
    group by c.id;`

    // store to Transaction table
    let storeToTransactionQuery = `insert into transaction set ?`
    
    // store to Transaction Detail
    let storeToDetailTransactionQuery = `
    INSERT INTO transaction_detail (product_name, product_price, qty, url, transaction_id, variant_product_id, gudang_id) VALUES ?`

   // store to status transaction name
        //select from transaction table *
                let getCurrentTransaction = `select * from transaction where id=?`
          // insert to status transaction
                let insertStatusTransaction= `insert into status_transaction set ?`
   let transactionStatus=`insert into `
    try {
        await query('START TRANSACTION')
        if(!data.token && !data.gudang_id && !data.shipping_to && !data.shipping_rates && !data.data) throw 'data not complete'
        const dataUser = await query(queryCheckUserIdQuery, users_id)
        .catch(error => {
            throw error
        })
        if(dataUser.length === 0) throw 'User not Found'
        

        const checkStockFromCart = await query(checkStockQuery, dataUser[0].id)
        .catch(error => {
            throw error
        })

        // check qty from cart apakah ada yg melebihi stock apa engga
        checkStockFromCart.forEach((val, i) => {
            if(val.stock < val.qty) throw `qty variant_id = ${val.variant_product_id} melebihi stock`
        })

        const resultStoreToTransaction = await query(storeToTransactionQuery, {users_id : dataUser[0].id, shipping_from : data.gudang_id, shipping_rates : data.shipping_rates, shipping_to : data.shipping_to, total_amount : data.total_amount })
        .catch(error => {
            throw error
        })
        
        let dataToInsert = []
        let transaction_id = resultStoreToTransaction.insertId
        let gudang_id = data.gudang_id
        data.data.forEach((val, i) => {
            dataToInsert.push([val.product_name, val.product_price, val.qty, val.url, transaction_id, val.variant_product_id, gudang_id])
        })
        
        const resultStoreToTransactionDetail = await query(storeToDetailTransactionQuery, [dataToInsert] )
        .catch(error => {
            throw error
        })

        //insert into status_transaction table
        let transaction_status= await query(getCurrentTransaction,resultStoreToTransaction.insertId).catch(error=>{throw error})
        let insertTotransactionStatus= await query(insertStatusTransaction,[{date:transaction_status[0].created_at,transaction_id:resultStoreToTransaction.insertId,status_name_id:1,is_done:0}])
        .catch(error=>{throw error})
        // get latLongUser
        const LatAndLongUser = await query(getLatAndLangUser, dataUser[0].id)
        .catch(error => {
            throw error
        })

        checkStockFromCart.forEach( async (dat, idx) => {
            let updateQty = []
            const dataStock = await query(`
            SELECT g.id, gudang_name, s.id as stock_id, stock_customer, variant_product_id ,(3956 * 2 * ASIN(SQRT( POWER(SIN(( ${LatAndLongUser[0].latUser} - latGudang) *  pi()/180 / 2), 2) +COS( ${LatAndLongUser[0].latUser} * pi()/180) * COS(latGudang * pi()/180) * POWER(SIN(( ${LatAndLongUser[0].longUser} - longGudang) * pi()/180 / 2), 2) ))) as distance  
            from gudang g
            join stock s on s.gudang_id = g.id
            where variant_product_id = ${dat.variant_product_id} 
            order by distance;`)
            .catch(error => {
                throw error
            })

            let qty = dat.qty
    
            dataStock.forEach(async(val, i) => {
                if(qty > 0){
                    updateQty.push({stock : Math.max(0, val.stock_customer - qty), id :val.stock_id })
                    db.query(`update stock set stock_customer = ${Math.max(0, val.stock_customer - qty)} where id = ${val.stock_id};`, (err, result) => {
                        if(err) throw err
                    })
                }else{
                    updateQty.push({stock :val.stock_customer, id : val.id})
                }
                qty -= val.stock_customer
            })
            updateQty.slice(0, updateQty.length -1)  
        })

        const resultDeleteCart = await query(`delete from cart where users_id = ${dataUser[0].id}`)
        .catch(error => {
            throw error
        })

        // send email to user
        fs.readFile('D:/project_firman/pejoy.com_back_end/template/emailConfirmation.html',{encoding :'utf-8'}, (err, file)=> {
            if(err) throw err
            const template = handlebars.compile(file)
            const hasilTemplating = template({
                total_amount : (parseInt(data.total_amount)).toLocaleString('id-ID'), 
                exipred : moment(new Date()).add(1, 'hour').format('lll'),
                link : 'http://localhost:3000/checkout-form/' + transaction_id
            })
            // send email confirm jika berhasil store ke database
            transporter.sendMail({
                from : "admin",
                subject : "thankyou for order",
                to : dataUser[0].email ,
                html : hasilTemplating
            })
            .then((respon) => {
            })
        })

        // console.log(resultStoreToTransactionDetail)
        await query("COMMIT");
         
        res.send({
            error : false,
            message : 'Add to Transaction Success email already send',
            // dataToInsert
        })
       
    } catch (error) {
        await query("ROLLBACK");
        console.log('ROLLBACK gagal update');
        res.send({
            error : true,
            message : error.message
        })
        console.log(error)
    }
}

const getSimilarProduct = async(req, res) => {
    let brands_id = req.params.id

    try {
        const getIdBrand = await query(`select brands_id from products
        where id = ?;`, brands_id)
        .catch(error => {
            throw error
        })

        if(getIdBrand.length === 0) throw 'id product not found'

        const similarProductData = await query(`select p.id,brands_id,price, sum(s.stock_customer) as stock_all_gudang , p.discount, p.name, url, brands_name from products p
        join variant_product vp on vp.products_id = p.id
        join brands b on b.id = p.brands_id
        join stock s on s.variant_product_id = vp.id
        join image_product ip on ip.products_id = p.id
        group by p.id
        having stock_all_gudang > 0 and p.brands_id = ${getIdBrand[0].brands_id} and p.id <> ${brands_id} 
        limit 4`)
        .catch(error => {
            throw error
        })

        res.send({
            error : false,
            similarProductData
        })
    } catch (error) {
        res.send({
            error : true,
            message : error.message
        })
    }
}

const addReviewController = async(req, res) => {
    let data = req.body
    let users_id = req.dataToken.id

    let dataToInsert = {
        users_id : users_id,
        rating : data.rating,
        review : data.review,
        products_id : data.products_id
    }
    let queryAddProduct = `insert into product_review set ?`
    try {
        if(!data.token && !data.rating && !data.review && !data.products_id) throw new Error('data not complete')

        const resultAdd = await query(queryAddProduct, dataToInsert)
        .catch(error => {
            throw error
        })
        res.send({
            error : false,
            message : 'add review succes'
        })
    } catch (error) {
        res.send({
            error : true,
            message : error.message
        })
    }
}

const getStockSetiapGudang = async(req, res) => {
    let variant_product_id = req.params.id
    
    let stockSetiapGudang = `select stock_customer, city_gudang from stock s
    join gudang g on s.gudang_id = g.id
    where variant_product_id = ?;`

    try {
        const dataStock = await query(stockSetiapGudang, variant_product_id)

        res.send({
            error : false,
            dataStock
        })
    } catch (error) {
        res.send({
            error : true,
            message : error.message
        })
    }

}

module.exports = {
    getFilter,
    getProductByCategory,
    getProductDetail,
    getProductByMultipleCategory,
    getCart,
    getEstimatedOngkir,
    addCart,
    deleteCart,
    updateQty,
    addTransaction,
    getSimilarProduct,
    addReviewController,
    getStockSetiapGudang,
    getAllProduct
}