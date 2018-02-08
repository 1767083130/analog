'use strict';

const CacheClient = require('ws-server').CacheClient;

let cacheClient = new class{
    constructor(){
        this._cacheClient = null;
    }
    
    getInstance(){
        if(!this._cacheClient){
            this._cacheClient = new CacheClient();
        }
        
        return this._cacheClient;
    }

}();

module.exports = cacheClient;