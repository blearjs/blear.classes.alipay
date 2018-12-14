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
     * 用于交易创建后，用户在一定时间内未进行支付，可调用该接口直接将未付款的交易进行关闭。
     * @param params {object}
     * @param params.outTradeNo {String} 订单支付时传入的商户订单号
     * @param callback
     */
    close: function (params, callback) {
        var qss = this[_signature]('alipay.trade.close', {
            out_trade_no: params.outTradeNo
        });

        this[_request]('alipay_trade_close_response', qss, function (data) {
            return {
                // 支付宝交易号
                tradeNo: data.trade_no,
                // 商户订单号
                outTradeNo: data.out_trade_no
            };
        }, callback);
    },

    /**
     * 撤销支付订单
     * 支付交易返回失败或支付系统超时，调用该接口撤销交易。如果此订单用户支付失败，
     * 支付宝系统会将此订单关闭；如果用户支付成功，支付宝系统会将此订单资金退还给用户。
     * 注意：只有发生支付系统超时或者支付结果未知时可调用撤销，其他正常支付的单如需实现
     * 相同功能请调用申请退款API。提交支付交易后调用【查询订单API】，没有明确的支付结果再调用【撤销订单API】。
     * @param params {object}
     * @param params.outTradeNo {String} 订单支付时传入的商户订单号
     * @param callback
     */
    cancel: function (params, callback) {
        var qss = this[_signature]('alipay.trade.cancel', {
            out_trade_no: params.outTradeNo
        });

        this[_request]('alipay_trade_cancel_response', qss, function (data) {
            return {
                // 支付宝交易号
                tradeNo: data.trade_no,
                // 商户订单号
                outTradeNo: data.out_trade_no,
                // 是否需要重试
                retryFlag: data.retry_flag,
                // 本次撤销触发的交易动作
                // close：关闭交易，无退款
                // refund：产生了退款
                action: data.action,
                // 当撤销产生了退款时，返回退款时间；
                // 默认不返回该信息，需与支付宝约定后配置返回；
                gmtRefundPay: data.gmt_refund_pay,
                // 当撤销产生了退款时，返回的退款清算编号，用于清算对账使用；
                // 只在银行间联交易场景下返回该信息；
                refundSettlementId: data.refund_settlement_id
            };
        }, callback);
    },

    /**
     * 交易查询
     * 该接口提供所有支付宝支付订单的查询，商户可以通过该接口主动查询订单状态，完成下一步的业务逻辑。
     * 需要调用查询接口的情况： 当商户后台、网络、服务器等出现异常，商户系统最终未接收到支付通知；
     * 调用支付接口后，返回系统错误或未知交易状态情况； 调用alipay.trade.pay，返回INPROCESS的状态；
     * 调用alipay.trade.cancel之前，需确认支付状态；
     * @param params {object}
     * @param params.outTradeNo {String} 订单支付时传入的商户订单号
     * @param callback
     */
    payQuery: function (params, callback) {
        var qss = this[_signature]('alipay.trade.query', {
            out_trade_no: params.outTradeNo
        });

        this[_request]('alipay_trade_query_response', qss, function (data) {
            return {
                // 支付宝交易号
                tradeNo: data.trade_no,
                // 商户订单号
                outTradeNo: data.out_trade_no,
                // 买家支付宝账号
                buyerLogonId: data.buyer_logon_id,
                // 交易状态：
                // WAIT_BUYER_PAY（交易创建，等待买家付款）、
                // TRADE_CLOSED（未付款交易超时关闭，或支付完成后全额退款）、
                // TRADE_SUCCESS（交易支付成功）、
                // TRADE_FINISHED（交易结束，不可退款）
                tradeStatus: data.trade_status,
                // 交易的订单金额，单位为元，两位小数。该参数的值为支付时传入的total_amount
                totalAmount: data.total_amount,
                // 买家在支付宝的用户id
                buyerUserId: data.buyer_user_id
            };
        }, callback);
    },

    /**
     * 退款
     * 该接口提供所有支付宝支付订单的查询，商户可以通过该接口主动查询订单状态，完成下一步的业务逻辑。
     * 需要调用查询接口的情况： 当商户后台、网络、服务器等出现异常，商户系统最终未接收到支付通知；
     * 调用支付接口后，返回系统错误或未知交易状态情况； 调用alipay.trade.pay，返回INPROCESS的状态；
     * 调用alipay.trade.cancel之前，需确认支付状态；
     * @param params {object}
     * @param params.outTradeNo {String} 订单支付时传入的商户订单号
     * @param params.refundAmount {Number} 需要退款的金额，该金额不能大于订单金额,单位为元，支持两位小数
     * @param [params.refundReason] {String} 退款原因
     * @param [params.outRequestNo] {String} 标识一次退款请求，同一笔交易多次退款需要保证唯一，如需部分退款，则此参数必传。
     * @param callback
     */
    refund: function (params, callback) {
        var qss = this[_signature]('alipay.trade.refund', {
            out_trade_no: params.outTradeNo,
            refund_amount: params.refundAmount,
            refund_reason: params.refundReason,
            out_request_no: params.outRequestNo,
        });

        this[_request]('alipay_trade_refund_response', qss, function (data) {
            return {
                // 支付宝交易号
                tradeNo: data.trade_no,
                // 商户订单号
                outTradeNo: data.out_trade_no,
                // 买家支付宝账号
                buyerLogonId: data.buyer_logon_id,
                // 本次退款是否发生了资金变化
                fundChange: data.fund_change,
                // 退款总金额
                refundFee: data.refund_fee,
                // 退款支付时间
                gmtRefundPay: data.gmt_refund_pay,
                // 买家在支付宝的用户id
                buyerUserId: data.buyer_user_id
            };
        }, callback);
    },

    /**
     * 退款查询
     * 商户可使用该接口查询自已通过alipay.trade.refund提交的退款请求是否执行成功。
     * 该接口的返回码10000，仅代表本次查询操作成功，不代表退款成功。如果该接口返回了查询数据，
     * 则代表退款成功，如果没有查询到则代表未退款成功，可以调用退款接口进行重试。
     * 重试时请务必保证退款请求号一致。
     * @param params {object}
     * @param params.outTradeNo {String} 订单支付时传入的商户订单号
     * @param params.refundAmount {Number} 需要退款的金额，该金额不能大于订单金额,单位为元，支持两位小数
     * @param [params.outRequestNo] {String} 请求退款接口时，传入的退款请求号，如果在退款请求时未传入，则该值为创建交易时的外部交易号
     * @param callback
     */
    refundQuery: function (params, callback) {
        var qss = this[_signature]('alipay.trade.fastpay.refund.query', {
            out_trade_no: params.outTradeNo,
            refund_amount: params.refundAmount,
            refund_reason: params.refundReason,
            out_request_no: params.outRequestNo,
        });

        this[_request]('alipay_trade_fastpay_refund_query_response', qss, function (data) {
            return {
                // 支付宝交易号
                tradeNo: data.trade_no,
                // 商户订单号
                outTradeNo: data.out_trade_no,
                // 买家支付宝账号
                buyerLogonId: data.buyer_logon_id,
                // 本次退款是否发生了资金变化
                fundChange: data.fund_change,
                // 退款总金额
                refundFee: data.refund_fee,
                // 退款支付时间
                gmtRefundPay: data.gmt_refund_pay,
                // 买家在支付宝的用户id
                buyerUserId: data.buyer_user_id
            };
        }, callback);
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
 * @param [inputParams]
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

    if (inputParams) {
        params.return_url = inputParams.returnUrl || options.returnUrl;
        params.notify_url = inputParams.notifyUrl || options.notifyUrl;
    }

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
 * @param pack
 * @param callback
 */
proto[_request] = function (resp, qss, pack, callback) {
    plan
        .as(this)
        .task(function (next) {
            request({
                method: 'get',
                browser: false,
                debug: true,
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
                return pack(data);
            }

            throw new Error(data.sub_msg);
        })
        .serial(callback);
};

