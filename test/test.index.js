/**
 * mocha 测试 文件
 * @author ydr.me
 * @create 2016-05-17 12:13
 */


'use strict';

var expect = require('chai-jasmine').expect;
var Alipay = require('../src/index.js');
var fs = require('fs');
var path = require('path');

describe('blear.classes.alipay', function () {
    var alipay = new Alipay({
        sandbox: true,
        appId: '2016091900548851',
        bizPrivateKey: fs.readFileSync(path.join(__dirname, 'keys/biz_private_key.pem'), 'utf8'),
        alipayPublicKey: fs.readFileSync(path.join(__dirname, 'keys/alipay_public_key.pem'), 'utf8')
    });

    it('pagePay', function (done) {
        var outTradeNo = Date.now() + '';
        var ret = alipay.pagePay({
            outTradeNo: outTradeNo,
            totalAmount: 0.01,
            subject: '单元测试商品标题',
            body: '单元测试商品描述',
            passbackParams: 'ABC'
        });

        console.log(ret);
        alipay.close({outTradeNo: outTradeNo}, function (err, ret) {
            console.log(err);
            console.log(ret);
            done();
        });
    });

});

