'use strict';

const CacheClient = require('ws-server').CacheClient;

let cacheClient = new class{
    
    getInstance(){
        let cacheClient = new CacheClient();
        return cacheClient;
    }

}();

module.exports = cacheClient;