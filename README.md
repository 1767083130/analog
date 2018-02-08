（0）npm install
（1）如何启动网站 npm start 或 node --harmony server.js
（2）如何启动单元测试  mocha --recursive
(3) 启动任务 node schedule

121.41.179.30
121.41.176.141

判断是否转币成功的替换方案
https://blockchain.info/zh-cn/api
https://etherscan.io/


权威的数字货币排行网站Coinmarketcap
日本的Coincheck，韩国的Korbit，新加坡的Quoine
 目前，Coinsecure、Unocoin和Local Bitcoins等主要的印度比特币交易所的投资者和买家大约用61,223 印度卢比（或900美元）的价格交易比特币，这比全球比特币交易所的平均价格高出近17%。

 https://blog.bitmex.com/bitmex无交割合约-利率互换/
https://gemini.com/

期货：bitvc.com  
https://www.bitmex.com/register
https://www.cryptofacilities.com/

coinnice.com sn:360yee

外汇平台
avatrade

 poloniex.com

 免费：
 https://www.quoine.com/fees/

 如果都不能转帐了,还有 https://localbitcoins.net/

 https://bitcointalk.org/index.php?topic=60501

错误代码：
 100002 : 用户帐户未同步
 100003 : 找不到用户的第三方交易网站的授权
 100004 : 调用第三方交易网站Api时网络错误
 100005 : 调用第三方交易网站Api时系统错误
 100006 : 参数错误
 100007 : 用户未登录
 100008 : 地址未找到
 100009 : JSON.parse 报错

 200000 ：其他系统错误

关于对交易品种的命名：
（一）coin的命名
btc 比特币
ltc 莱特币
eth 以太坊
etc 经典以太坊 
ybc 元宝币

cny 人民币
jpy 日元
usd 美元
eur 欧元 

（二）交易品种的通用命名 
（1）现货 
 btc#cny
 ltc#btc
 btc  等价于btc#cny

 额外的，针对不同交易所的命名方法也同样支持
 比如说 bitmex交易所使用xbt表示比特币，所以，bitmex.xbt表示btc#cny

 (2)期货
  期货的合约类型有两种表示方法。每隔一个周期交割和到某一日交割
  1.每隔一个周期交割，这种是以数字开头的，后面再跟一个计量单位，分别用d、m、q、y表示天、月、季度、年
  2.到某一日交割,交割到期日的表示方法为：月份代码（如H） + 年份代码(如17) + 日期（如31），日期可以省略，日期默认为到期月份的最后1天
  3.ever或为空时表示掉期合约

	月码	月份	月码	月份
	F	一月	N	七月
	G	二月	Q	八月
	H	三月	U	九月
	J	四月	V	十月
	K	五月	X	十一月
	M	六月	Z	十二月
 
 btc#usd_ever btc#usd_  表示　美元对比特币的掉期和约
 btc#cny_1d btc_1w  表示周期为7天的人民币对比特币的交易期货。1d表示每天，2d表示每２天，分别用d、w、m、q、y
 btc#cny_1q  表示周期为1个季度的人民币对比特币的交易期货
 btc#cny_h17 表示2017年3月31到期的人民币对比特币的合约
 btc#cny_h1731 表示2017年3月31到期的人民币对比特币的合约
 btc#cny_spot 表示现货

  额外的，针对不同交易所的命名方法也同样支持
 比如说 bitmex交易所使用xbt、xbtusd表示比特币掉期交易；XBCH17,表示2017年3月31到期的人民币对比特币的合约

 
