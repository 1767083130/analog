'use strict';
const configUtil = require('./apiClient/configUtil');

let utilsApi = new class{
    /**
     * 获取美元兑人民币汇率
     */
    async getUsdRate(){
        let api = this.getApiClient('okex');

        let apiName = '/api/v1/exchange_rate';
        let options = {      
            method: "GET" 
        };
        let apiRes = await api.execute(apiName,options);
        if(!apiRes.isSuccess){
            return apiRes;
        }
        return { isSuccess: apiRes.isSuccess, rate: apiRes.body.rate };
    }


    /**
     * 获取交易网站api调用接口。特别注意的是，这个接口外部不能再调用，有可能带来安全隐患 //TODO
     * @param {Object} identifierOrSite
     */
    getApiClient(identifierOrSite){
        let identifier,site;

        if(typeof identifierOrSite == 'string'){
            site = identifierOrSite;
            identifier = configUtil.getDefaultIdentifier(identifierOrSite);
        }else{
            identifier = identifierOrSite;
            site = identifier.site;
        }

        if(!identifier){
            return null;
        } else{
            identifier.site = site;
        }

        let siteClient = configUtil.getSiteClientConfig(site);
        if(!siteClient){
            throw new Error(`不支持的交易网站:${site}`);
        }
        let Client = siteClient.futuresApi;
        if(!Client){
            throw new Error(`不支持的交易网站:${site}`);
        }

        return new Client(identifier);
    }

}()

module.exports = utilsApi