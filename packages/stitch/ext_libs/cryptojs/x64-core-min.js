/*
CryptoJS v4.0.0
[The MIT License (MIT)](http://opensource.org/licenses/MIT)
Copyright (c) 2009-2013 Jeff Mott
Copyright (c) 2013-2016 Evan Vosberg
*/
!function(t,e){"object"==typeof exports?module.exports=exports=e(require("./core")):"function"==typeof define&&define.amd?define(["./core"],e):e(t.CryptoJS)}(this,function(t){var e,o,r,n,i;return o=(e=t).lib,r=o.Base,n=o.WordArray,(i=e.x64={}).Word=r.extend({init:function(t,e){this.high=t,this.low=e}}),i.WordArray=r.extend({init:function(t,e){t=this.words=t||[],this.sigBytes=null!=e?e:8*t.length},toX32:function(){for(var t=this.words,e=t.length,o=[],r=0;r<e;r++){var i=t[r];o.push(i.high),o.push(i.low)}return n.create(o,this.sigBytes)},clone:function(){for(var t=r.clone.call(this),e=t.words=this.words.slice(0),o=e.length,n=0;n<o;n++)e[n]=e[n].clone();return t}}),t});
