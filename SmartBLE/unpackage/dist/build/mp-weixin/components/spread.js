(global["webpackJsonp"]=global["webpackJsonp"]||[]).push([["components/spread"],{"209f":function(t,n,u){"use strict";var e=u("b33c"),i=u.n(e);i.a},"37df":function(t,n,u){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var e={name:"spread",data:function(){return{}},computed:{dotW:function(){return.2*this.w},dotL:function(){return.5*(this.w-this.dotW)},dotT:function(){return.5*(this.h-this.dotW)},pulseW:function(){return.5*this.w},pulseL:function(){return.5*(this.w-this.pulseW)},pulseT:function(){return.5*(this.h-this.pulseW)-this.dotW},pulse1W:function(){return.9*this.w},pulse1L:function(){return.5*(this.w-this.pulse1W)},pulse1T:function(){return.5*(this.h-this.pulse1W)-this.pulseW-this.dotW}},props:{w:{type:Number,value:0},h:{type:Number,value:0}}};n.default=e},5256:function(t,n,u){"use strict";u.d(n,"b",(function(){return e})),u.d(n,"c",(function(){return i})),u.d(n,"a",(function(){}));var e=function(){var t=this.$createElement;this._self._c},i=[]},a693:function(t,n,u){"use strict";u.r(n);var e=u("37df"),i=u.n(e);for(var r in e)["default"].indexOf(r)<0&&function(t){u.d(n,t,(function(){return e[t]}))}(r);n["default"]=i.a},abd3:function(t,n,u){"use strict";u.r(n);var e=u("5256"),i=u("a693");for(var r in i)["default"].indexOf(r)<0&&function(t){u.d(n,t,(function(){return i[t]}))}(r);u("209f");var s=u("828b"),o=Object(s["a"])(i["default"],e["b"],e["c"],!1,null,null,null,!1,e["a"],void 0);n["default"]=o.exports},b33c:function(t,n,u){}}]);
;(global["webpackJsonp"] = global["webpackJsonp"] || []).push([
    'components/spread-create-component',
    {
        'components/spread-create-component':(function(module, exports, __webpack_require__){
            __webpack_require__('df3c')['createComponent'](__webpack_require__("abd3"))
        })
    },
    [['components/spread-create-component']]
]);
