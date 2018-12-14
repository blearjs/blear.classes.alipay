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

    it('#pagePay + #close', function (done) {
        var outTradeNo = Date.now() + 'A';
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

    it('#pagePay + #cancel', function (done) {
        var outTradeNo = Date.now() + 'B';
        var ret = alipay.pagePay({
            outTradeNo: outTradeNo,
            totalAmount: 0.01,
            subject: '单元测试商品标题',
            body: '单元测试商品描述',
            passbackParams: 'ABC'
        });

        console.log(ret);
        alipay.cancel({outTradeNo: outTradeNo}, function (err, ret) {
            console.log(err);
            console.log(ret);
            done();
        });
    });

    it('#pagePay + #query', function (done) {
        var outTradeNo = Date.now() + 'C';
        var ret = alipay.pagePay({
            outTradeNo: outTradeNo,
            totalAmount: 0.01,
            subject: '单元测试商品标题',
            body: '单元测试商品描述',
            passbackParams: 'ABC'
        });

        console.log(ret);
        alipay.payQuery({outTradeNo: outTradeNo}, function (err, ret) {
            console.log(err);
            console.log(ret);
            done();
        });
    });

    it('#pagePay + #refund + refundQuery', function (done) {
        var outTradeNo = Date.now() + 'D';
        var ret = alipay.pagePay({
            outTradeNo: outTradeNo,
            totalAmount: 100.00,
            subject: '单元测试商品标题',
            body: '单元测试商品描述',
            passbackParams: 'ABC'
        });

        console.log(ret);
        alipay.refund({
            outTradeNo: outTradeNo,
            refundAmount: 99.00,
            outRequestNo: outTradeNo + 'D'
        }, function (err, ret) {
            console.log(err);
            console.log(ret);

            alipay.refundQuery({
                outTradeNo: outTradeNo,
                outRequestNo: outTradeNo + 'D'
            }, function (err, ret) {
                console.log(err);
                console.log(ret);
                done();
            });

        });
    });

});

