/*
CryptoJS v4.0.0
[The MIT License (MIT)](http://opensource.org/licenses/MIT)
Copyright (c) 2009-2013 Jeff Mott
Copyright (c) 2013-2016 Evan Vosberg
*/
!function(e,i,n){"object"==typeof exports?module.exports=exports=i(require("./core"),require("./x64-core"),require("./sha512")):"function"==typeof define&&define.amd?define(["./core","./x64-core","./sha512"],i):i(e.CryptoJS)}(this,function(e){var i,n,t,r,o,a,c;return n=(i=e).x64,t=n.Word,r=n.WordArray,o=i.algo,a=o.SHA512,c=o.SHA384=a.extend({_doReset:function(){this._hash=new r.init([new t.init(3418070365,3238371032),new t.init(1654270250,914150663),new t.init(2438529370,812702999),new t.init(355462360,4144912697),new t.init(1731405415,4290775857),new t.init(2394180231,1750603025),new t.init(3675008525,1694076839),new t.init(1203062813,3204075428)])},_doFinalize:function(){var e=a._doFinalize.call(this);return e.sigBytes-=16,e}}),i.SHA384=a._createHelper(c),i.HmacSHA384=a._createHmacHelper(c),e.SHA384});
