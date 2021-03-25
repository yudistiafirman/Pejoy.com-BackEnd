function categoryFilter(params) {
    var conditions = [];
    var values = [];
    var conditionsStr = ''
  
    if (typeof params.category !== 'undefined') {
        conditions.push(`category_id = ${params.category}`)
    }
    if (typeof params.brands !== 'undefined') {
      conditions.push(`b.brands_name like '%${params.brands}%'`)
    }
    return {
      where: conditions.length ?
               conditions.join(' AND ') : '1'
    };
}

module.exports = categoryFilter