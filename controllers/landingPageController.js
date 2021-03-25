const db = require('./../database/mysql');
const jwt = require('jsonwebtoken');

module.exports = {
    getAllFlashSaleProducts: (req, res) => {
        var sqlQuery = `SELECT p.id as id, p.name AS name, MIN(vp.price) AS price, p.discount AS discount, SUM(s.stock_customer) AS stock_products_in_all_warehouse, GROUP_CONCAT(DISTINCT(ip.url)) AS url FROM products p
        JOIN variant_product vp ON vp.products_id = p.id
        JOIN stock s ON s.variant_product_id = vp.id
        JOIN image_product ip ON ip.products_id = p.id
        WHERE p.is_flash_sale = 1
        GROUP BY p.id
        HAVING stock_products_in_all_warehouse > 0;`
        db.query(sqlQuery, (err, result) => {
            try {
                if(err) throw err
            
                res.send({
                    error: false,
                    message: 'Get All Flash Sale Products Success',
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

    getAllBestSellerProducts: (req, res) => {
        var sqlQuery = `SELECT p.id as id, p.name, MIN(vp.price) AS price, p.discount, SUM(DISTINCT td.qty) AS total_sold, ip.url FROM transaction_detail td
        JOIN variant_product vp ON vp.id = td.variant_product_id
        JOIN products p ON p.id = vp.products_id
        JOIN image_product ip ON ip.products_id = p.id 
        JOIN status_transaction st ON td.transaction_id = st.transaction_id
        WHERE st.status_name_id = 4 GROUP BY p.id ORDER BY total_sold DESC;`
        db.query(sqlQuery, (err, result) => {
            try {
                if(err) throw err
                console.log(result)
                res.send({
                    error: false,
                    message: 'Get All Best Seller Products Success',
                    data: result
                })
            } catch (error) {
                res.send({
                    error: true,
                    message : error.message
                })
            }
        })
    }
}