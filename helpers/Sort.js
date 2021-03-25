const sort = (params) => {

    var conditions = '';

    if(params === 'DESC') {
        return 'order by price DESC'
      
    }else if (params === 'ASC') {
        return 'order by price ASC'
        
    }else if(params === 'DEFAULT'){
        return 'order by p.id ASC'
        
    }
    
}

module.exports = sort