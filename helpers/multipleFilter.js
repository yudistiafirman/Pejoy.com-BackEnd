function buildConditions(params) {
    var conditions = [];
    var values = [];
    var conditionsStr = ''
  
    if (params.category.length !== 0) {
        conditions.push(`category_id in (${params.category})`)
    }
    if (params.brands.length !== 0) {
        conditions.push(`brand_id in (${params.brands})`)
    }
    if (params.rating.length !== 0) {
        conditions.push(`pr.rating in (${params.rating})`)
    }
    if (params.price.length !== 0) {
        conditions.push(`price BETWEEN ${params.price1} and ${params.price2}`)
    }
    if (params.discount !== '') {
        conditions.push(`discount ${params.discount}`)
    }
   
  
    return {
      where: conditions.length ?
               conditions.join(' AND ') : '1',
    };
}

module.exports = buildConditions