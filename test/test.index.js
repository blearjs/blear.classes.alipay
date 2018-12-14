/**
 * mocha 测试 文件
 * @author ydr.me
 * @create 2016-05-17 12:13
 */


'use strict';

var expect = require('chai-jasmine').expect;
var index = require('../src/index.js');

describe('blear.classes.alipay', function () {

    it('exports', function () {
        expect(index).toEqual('index');
    });

});

