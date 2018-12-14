/**
 * blear.classes.alipay
 * @author ydr.me
 * @create 2016年06月04日14:09:36
 */


'use strict';

var Class = require('blear.classes.class');
var object = require('blear.utils.object');
var date = require('blear.utils.date');
var qs = require('blear.utils.querystring');
var request = require('blear.node.request');
var plan = require('blear.utils.plan');
var crypto = require('crypto');

var publicApi = 'https://openapi.alipay.com/gateway.do';
var sandboxApi = 'https://openapi.alipaydev.com/gateway.do';
var defaults = {
    /**
     * 是否沙箱模式
     * @type boolean
     */
    sandbox: false,

    /**
     * APPID
     * @type String
     */
    appId: '',

    /**
     * 跳转地址
     * @type String
     */
    returnUrl: '',

    /**
     * 通知地址
     * @type String
     */
    notifyUrl: '',

    /**
     * 业务私钥
     * @type String
     */
    bizPrivateKey: '',

    /**
     * 支付宝公钥
     * @type String
     */
    alipayPublicKey: ''
};
var Alipay = Class.extend({
    className: 'Alipay',
    constructor: function (options) {
        Alipay.parent(this);
        options = this[_options] = object.assign({}, defaults, options);
        this.api = options.sandbox ? sandboxApi : publicApi;
        this[_formatPem]();
    },

    /**
     * 桌面端网页支付
     * @param params {object}
     * @param [params.returnUrl] {String} 同步返回地址，HTTP/HTTPS开头字符串
     * @param [params.notifyUrl] {String} 支付宝服务器主动通知商户服务器里指定的页面http/https路径。
     * @param params.outTradeNo {String} 商户订单号，64个字符以内、可包含字母、数字、下划线；需保证在商户端不重复
     * @param params.totalAmount {Number} 订单总金额，单位为元，精确到小数点后两位，取值范围[0.01,100000000]
     * @param params.subject {String} 订单标题
     * @param params.body {String} 订单描述
     * @param params.passbackParams {String} 公用回传参数，如果请求时传递了该参数，则返回给商户时会回传该参数。支付宝只会在异步通知时将该参数原样返回。本参数必须进行UrlEncode之后才可以发送给支付宝
     * @param [params.qrPayMode=4] {Number} PC扫码支付的方式，支持前置模式和跳转模式。
     * 前置模式是将二维码前置到商户的订单确认页的模式。需要商户在自己的页面中以iframe方式请求支付宝页面。具体分为以下几种：
     * 0：订单码-简约前置模式，对应iframe宽度不能小于600px，高度不能小于300px；
     * 1：订单码-前置模式，对应iframe宽度不能小于300px，高度不能小于600px；
     * 2：订单码-跳转模式，跳转模式下，用户的扫码界面是由支付宝生成的，不在商户的域名下。
     * 3：订单码-迷你前置模式，对应iframe宽度不能小于75px，高度不能小于75px；
     * 4：订单码-可定义宽度的嵌入式二维码，商户可根据需要设定二维码的大小。【默认】
     * @param [params.qrcodeWidth=300] {Number} 商户自定义二维码宽度
     */
    pagePay: function (params) {
        var qss = this[_signature]('alipay.trade.page.pay', {
            out_trade_no: params.outTradeNo,
            product_code: 'FAST_INSTANT_TRADE_PAY',
            total_amount: params.totalAmount,
            subject: params.subject,
            body: params.body,
            passback_params: params.passbackParams,
            qr_pay_mode: params.qrPayMode || 4,
            qrcode_width: params.qrcodeWidth || 300
        }, params);
        return this[_buildUrl](qss);
    },

    /**
     * 关闭支付订单
     * @param params {object}
     * @param [params.returnUrl] {String} 同步返回地址，HTTP/HTTPS开头字符串
     * @param [params.notifyUrl] {String} 支付宝服务器主动通知商户服务器里指定的页面http/https路径。
     * @param params.outTradeNo 订单支付时传入的商户订单号
     * @param callback
     */
    close: function (params, callback) {
        var qss = this[_signature]('alipay.trade.close', {
            out_trade_no: params.outTradeNo
        }, params);

        this[_request]('alipay_trade_close_response', qss, callback);
    }
});
var sole = Alipay.sole;
var proto = Alipay.prototype;
var _options = sole();
var _formatPem = sole();
var _makeParams = sole();
var _signature = sole();
var _buildUrl = sole();
var _request = sole();

Alipay.defaults = defaults;
module.exports = Alipay;


// ====================================================================
// ====================================================================
// ====================================================================

proto[_formatPem] = function () {

};

/**
 * 格式化
 * @param method
 * @param privateParams
 * @param inputParams
 * @returns {String}
 */
proto[_makeParams] = function (method, privateParams, inputParams) {
    var options = this[_options];
    var sortedParams = {};
    var params = {
        app_id: options.appId,
        method: method,
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        // 发送请求的时间，格式"yyyy-MM-dd HH:mm:ss"
        timestamp: date.format('YYYY-MM-DD HH:mm:ss'),
        version: '1.0'
    };

    params.biz_content = JSON.stringify(privateParams);
    params.return_url = inputParams.returnUrl || options.returnUrl;
    params.notify_url = inputParams.notifyUrl || options.notifyUrl;

    var keys = [];
    object.each(params, function (key, val) {
        if (val !== undefined && val !== '') {
            keys.push(key);
        }
    });
    keys = keys.sort();
    keys.forEach(function (key) {
        sortedParams[key] = params[key];
    });

    return sortedParams;
};

/**
 * 签名
 * @param method
 * @param privateParams
 * @param inputParams
 * @returns {string}
 */
proto[_signature] = function (method, privateParams, inputParams) {
    var options = this[_options];
    var params = this[_makeParams](method, privateParams, inputParams);
    var list = [];

    object.each(params, function (key, val) {
        list.push(key + '=' + val);
    });

    params.sign = crypto
        .createSign('RSA-SHA256')
        .update(list.join('&'))
        .sign(options.bizPrivateKey, 'base64');
    return qs.stringify(params);
};


/**
 * 生成请求 URL
 * @param qss
 * @returns {string}
 */
proto[_buildUrl] = function (qss) {
    return this.api + '?' + qss;
};


/**
 * 请求
 * @param resp
 * @param qss
 * @param callback
 */
proto[_request] = function (resp, qss, callback) {
    plan
        .as(this)
        .task(function (next) {
            request({
                method: 'get',
                browser: false,
                url: this[_buildUrl](qss)
            }, next)
        })
        .taskSync(function (body) {
            try {
                return JSON.parse(body);
            } catch (err) {
                throw new Error('支付宝返回信息解析失败');
            }
        })
        .taskSync(function (json) {
            var data = json[resp];

            if (/success/i.test(data.msg)) {
                return {
                    tradeNo: data.trade_no,
                    outTradeNo: data.out_trade_no
                };
            }

            throw new Error(data.sub_msg);
        })
        .serial(callback);
};

