(global["webpackJsonp"] = global["webpackJsonp"] || []).push([["pages/tabbar/scanner"],{

/***/ 36:
/*!*****************************************************************************************************!*\
  !*** /Users/lys/Desktop/project/job/smart-ble/SmartBLE/main.js?{"page":"pages%2Ftabbar%2Fscanner"} ***!
  \*****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(wx, createPage) {

var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ 4);
__webpack_require__(/*! uni-pages */ 26);
var _vue = _interopRequireDefault(__webpack_require__(/*! vue */ 25));
var _scanner = _interopRequireDefault(__webpack_require__(/*! ./pages/tabbar/scanner.vue */ 37));
// @ts-ignore
wx.__webpack_require_UNI_MP_PLUGIN__ = __webpack_require__;
createPage(_scanner.default);
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./node_modules/@dcloudio/uni-mp-weixin/dist/wx.js */ 1)["default"], __webpack_require__(/*! ./node_modules/@dcloudio/uni-mp-weixin/dist/index.js */ 2)["createPage"]))

/***/ }),

/***/ 37:
/*!**********************************************************************************!*\
  !*** /Users/lys/Desktop/project/job/smart-ble/SmartBLE/pages/tabbar/scanner.vue ***!
  \**********************************************************************************/
/*! no static exports found */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _scanner_vue_vue_type_template_id_603e9f86___WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./scanner.vue?vue&type=template&id=603e9f86& */ 38);
/* harmony import */ var _scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./scanner.vue?vue&type=script&lang=js& */ 40);
/* harmony reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in _scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_1__) if(["default"].indexOf(__WEBPACK_IMPORT_KEY__) < 0) (function(key) { __webpack_require__.d(__webpack_exports__, key, function() { return _scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_1__[key]; }) }(__WEBPACK_IMPORT_KEY__));
/* harmony import */ var _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_runtime_componentNormalizer_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/vue-loader/lib/runtime/componentNormalizer.js */ 32);

var renderjs




/* normalize component */

var component = Object(_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_runtime_componentNormalizer_js__WEBPACK_IMPORTED_MODULE_2__["default"])(
  _scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_1__["default"],
  _scanner_vue_vue_type_template_id_603e9f86___WEBPACK_IMPORTED_MODULE_0__["render"],
  _scanner_vue_vue_type_template_id_603e9f86___WEBPACK_IMPORTED_MODULE_0__["staticRenderFns"],
  false,
  null,
  null,
  null,
  false,
  _scanner_vue_vue_type_template_id_603e9f86___WEBPACK_IMPORTED_MODULE_0__["components"],
  renderjs
)

component.options.__file = "pages/tabbar/scanner.vue"
/* harmony default export */ __webpack_exports__["default"] = (component.exports);

/***/ }),

/***/ 38:
/*!*****************************************************************************************************************!*\
  !*** /Users/lys/Desktop/project/job/smart-ble/SmartBLE/pages/tabbar/scanner.vue?vue&type=template&id=603e9f86& ***!
  \*****************************************************************************************************************/
/*! exports provided: render, staticRenderFns, recyclableRender, components */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_loaders_templateLoader_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_17_0_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_template_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_uni_app_loader_page_meta_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_template_id_603e9f86___WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/vue-loader/lib/loaders/templateLoader.js??vue-loader-options!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader??ref--17-0!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/webpack-uni-mp-loader/lib/template.js!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-uni-app-loader/page-meta.js!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/vue-loader/lib??vue-loader-options!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/webpack-uni-mp-loader/lib/style.js!./scanner.vue?vue&type=template&id=603e9f86& */ 39);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "render", function() { return _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_loaders_templateLoader_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_17_0_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_template_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_uni_app_loader_page_meta_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_template_id_603e9f86___WEBPACK_IMPORTED_MODULE_0__["render"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "staticRenderFns", function() { return _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_loaders_templateLoader_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_17_0_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_template_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_uni_app_loader_page_meta_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_template_id_603e9f86___WEBPACK_IMPORTED_MODULE_0__["staticRenderFns"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "recyclableRender", function() { return _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_loaders_templateLoader_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_17_0_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_template_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_uni_app_loader_page_meta_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_template_id_603e9f86___WEBPACK_IMPORTED_MODULE_0__["recyclableRender"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "components", function() { return _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_loaders_templateLoader_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_17_0_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_template_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_uni_app_loader_page_meta_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_template_id_603e9f86___WEBPACK_IMPORTED_MODULE_0__["components"]; });



/***/ }),

/***/ 39:
/*!*****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/@dcloudio/vue-cli-plugin-uni/packages/vue-loader/lib/loaders/templateLoader.js??vue-loader-options!./node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader??ref--17-0!./node_modules/@dcloudio/webpack-uni-mp-loader/lib/template.js!./node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-uni-app-loader/page-meta.js!./node_modules/@dcloudio/vue-cli-plugin-uni/packages/vue-loader/lib??vue-loader-options!./node_modules/@dcloudio/webpack-uni-mp-loader/lib/style.js!/Users/lys/Desktop/project/job/smart-ble/SmartBLE/pages/tabbar/scanner.vue?vue&type=template&id=603e9f86& ***!
  \*****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! exports provided: render, staticRenderFns, recyclableRender, components */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "render", function() { return render; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "staticRenderFns", function() { return staticRenderFns; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "recyclableRender", function() { return recyclableRender; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "components", function() { return components; });
var components
try {
  components = {
    uniFab: function () {
      return __webpack_require__.e(/*! import() | uni_modules/uni-fab/components/uni-fab/uni-fab */ "uni_modules/uni-fab/components/uni-fab/uni-fab").then(__webpack_require__.bind(null, /*! @/uni_modules/uni-fab/components/uni-fab/uni-fab.vue */ 137))
    },
  }
} catch (e) {
  if (
    e.message.indexOf("Cannot find module") !== -1 &&
    e.message.indexOf(".vue") !== -1
  ) {
    console.error(e.message)
    console.error("1. 排查组件名称拼写是否正确")
    console.error(
      "2. 排查组件是否符合 easycom 规范，文档：https://uniapp.dcloud.net.cn/collocation/pages?id=easycom"
    )
    console.error(
      "3. 若组件不符合 easycom 规范，需手动引入，并在 components 中注册该组件"
    )
  } else {
    throw e
  }
}
var render = function () {
  var _vm = this
  var _h = _vm.$createElement
  var _c = _vm._self._c || _h
}
var recyclableRender = false
var staticRenderFns = []
render._withStripped = true



/***/ }),

/***/ 40:
/*!***********************************************************************************************************!*\
  !*** /Users/lys/Desktop/project/job/smart-ble/SmartBLE/pages/tabbar/scanner.vue?vue&type=script&lang=js& ***!
  \***********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_babel_loader_lib_index_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_13_1_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_script_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/babel-loader/lib!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader??ref--13-1!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/webpack-uni-mp-loader/lib/script.js!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/vue-loader/lib??vue-loader-options!../../../../../../../../../Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/webpack-uni-mp-loader/lib/style.js!./scanner.vue?vue&type=script&lang=js& */ 41);
/* harmony import */ var _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_babel_loader_lib_index_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_13_1_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_script_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_babel_loader_lib_index_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_13_1_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_script_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_0__);
/* harmony reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_babel_loader_lib_index_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_13_1_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_script_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_0__) if(["default"].indexOf(__WEBPACK_IMPORT_KEY__) < 0) (function(key) { __webpack_require__.d(__webpack_exports__, key, function() { return _Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_babel_loader_lib_index_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_13_1_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_script_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_0__[key]; }) }(__WEBPACK_IMPORT_KEY__));
 /* harmony default export */ __webpack_exports__["default"] = (_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_babel_loader_lib_index_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_webpack_preprocess_loader_index_js_ref_13_1_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_script_js_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_vue_cli_plugin_uni_packages_vue_loader_lib_index_js_vue_loader_options_Applications_HBuilderX_app_Contents_HBuilderX_plugins_uniapp_cli_node_modules_dcloudio_webpack_uni_mp_loader_lib_style_js_scanner_vue_vue_type_script_lang_js___WEBPACK_IMPORTED_MODULE_0___default.a); 

/***/ }),

/***/ 41:
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib!./node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader??ref--13-1!./node_modules/@dcloudio/webpack-uni-mp-loader/lib/script.js!./node_modules/@dcloudio/vue-cli-plugin-uni/packages/vue-loader/lib??vue-loader-options!./node_modules/@dcloudio/webpack-uni-mp-loader/lib/style.js!/Users/lys/Desktop/project/job/smart-ble/SmartBLE/pages/tabbar/scanner.vue?vue&type=script&lang=js& ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(uni) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var item = function item() {
  Promise.all(/*! require.ensure | components/scannerItem */[__webpack_require__.e("common/vendor"), __webpack_require__.e("components/scannerItem")]).then((function () {
    return resolve(__webpack_require__(/*! @/components/scannerItem.vue */ 144));
  }).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};
var spread = function spread() {
  __webpack_require__.e(/*! require.ensure | components/spread */ "components/spread").then((function () {
    return resolve(__webpack_require__(/*! @/components/spread.vue */ 163));
  }).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};
var _default = {
  components: {
    item: item,
    spread: spread
  },
  computed: {
    isEmpty: function isEmpty() {
      return this.showList.length > 0 ? false : true;
    }
  },
  data: function data() {
    return {
      isMp: false,
      pattern: {
        color: '#7A7E83',
        backgroundColor: '#fff',
        selectedColor: '#1677ff',
        buttonColor: '#fff',
        iconColor: '#1677ff'
      },
      directionStr: '垂直',
      horizontal: 'right',
      vertical: 'bottom',
      direction: 'horizontal',
      content: [{
        iconPath: '/static/imgs/more.png',
        active: false
      }, {
        iconPath: '/static/imgs/search.png',
        active: false
      }, {
        iconPath: '/static/imgs/scan.png',
        active: false
      }],
      windowWidth: 0,
      windowHeight: 0,
      list: [],
      showList: [],
      FilterName: '',
      // 过滤器 - 名称
      FilterUUID: '',
      // 过滤器 - UUID
      FilterRSSI: -100,
      // 过滤器 - RSSI
      FilterEmpty: false // 过滤器 - 空名过滤
    };
  },

  methods: {
    getSystemInfo: function getSystemInfo() {
      this.isMp = true;
      var that = this;
      uni.getSystemInfo({
        success: function success(res) {
          that.windowWidth = res.windowWidth;
          that.windowHeight = res.windowHeight;
        }
      });
    },
    scanCode: function scanCode() {
      var that = this;
      var url = "/pages/scanner/equipment";
      uni.scanCode({
        success: function success(res) {
          if (res.scanType != 'QR_CODE') {
            uni.showToast({
              icon: 'none',
              title: "当前仅支持二维码扫码识别"
            });
          } else {
            // let obj = JSON.parse(res.result)
            var obj = that.showList[0];
            that.itemAction(obj);
          }
        }
      });
    },
    refresh: function refresh() {
      var that = this;
      uni.stopBluetoothDevicesDiscovery({
        complete: function complete(res) {
          that.list = [];
          that.showList = [];
          that.bleOpenBluetoothAdapter();
        }
      });
    },
    filter: function filter() {
      uni.navigateTo({
        url: "../scanner/filter"
      });
    },
    itemAction: function itemAction(obj) {
      var url = "../scanner/equipment?item=" + JSON.stringify(obj);
      uni.navigateTo({
        url: url
      });
    },
    refreshStatus: function refreshStatus(state) {},
    trigger: function trigger(e) {
      switch (e.index) {
        case 0:
          this.filter();
          break;
        case 1:
          uni.startPullDownRefresh();
          break;
        case 2:
          this.scanCode();
          break;
      }
    },
    show: function show() {
      var that = this;
      var FilterName = uni.getStorageSync('FilterName');
      if (FilterName) {
        that.FilterName = FilterName;
      } else {
        that.FilterName = that.$Config.Conf.FilterName;
        uni.setStorage({
          key: 'FilterName',
          data: that.FilterName
        });
      }
      var FilterUUID = uni.getStorageSync('FilterUUID');
      if (FilterUUID) {
        that.FilterUUID = FilterUUID;
      } else {
        that.FilterUUID = that.$Config.Conf.FilterUUID;
        uni.setStorage({
          key: 'FilterUUID',
          data: that.FilterUUID
        });
      }
      var FilterRSSI = uni.getStorageSync('FilterRSSI');
      if (FilterRSSI) {
        that.FilterRSSI = FilterRSSI;
      } else {
        that.FilterRSSI = that.$Config.Conf.FilterRSSI;
        uni.setStorage({
          key: 'FilterRSSI',
          data: that.FilterRSSI
        });
      }
      var FilterEmpty = uni.getStorageSync('FilterEmpty');
      if (FilterEmpty) {
        that.FilterEmpty = FilterEmpty;
      } else {
        that.FilterEmpty = that.$Config.Conf.FilterEmpty;
        uni.setStorage({
          key: 'FilterEmpty',
          data: that.FilterEmpty
        });
      }
      that.dataRegularization();
      that.bleOpenBluetoothAdapter();
      // uni.getBluetoothAdapterState({
      // 	fail(res) {
      // 		uni.showToast({
      // 			icon: 'none',
      // 			title: '请查看蓝牙是否开启'
      // 		})
      // 	},
      // 	success(res) {
      // 		that.bleOpenBluetoothAdapter()
      // 	}
      // })

      // setInterval(function() {
      // 	console.log('------ 蓝牙状态 ----')
      // }, 300)
    },

    dataRegularization: function dataRegularization() {
      var list = [];
      var count = this.list.length;
      for (var i = 0; i < this.list.length; i++) {
        var itemObj = this.list[i];
        var name = itemObj.name ? itemObj.name : itemObj.localName;
        var add = true;
        // 空名过滤
        if (this.FilterEmpty) {
          if (!name) add = false;
        }
        // 过滤器 - RSSI
        if (!(itemObj.RSSI > this.FilterRSSI)) add = false;
        // 过滤器 - 名称
        if (this.FilterName.length > 0 && (!name || name.indexOf(this.FilterName)) < 0) add = false;
        // 过滤器 - UUID	
        if (itemObj.deviceId.indexOf(this.FilterUUID) < 0) add = false;
        if (add) list.push(itemObj);
      }
      this.showList = list;
    },
    // 蓝牙相关
    // 初始化蓝牙模块
    bleOpenBluetoothAdapter: function bleOpenBluetoothAdapter() {
      var that = this;
      uni.openBluetoothAdapter({
        mode: 'cnetral',
        success: function success(res) {
          that.bleStartBluetoothDevicesDiscovery();
        },
        fail: function fail(res) {
          if (res.errMsg == 'openBluetoothAdapter:fail already opened') {
            that.bleStartBluetoothDevicesDiscovery();
          } else {
            uni.showToast({
              icon: 'none',
              title: res.errMsg
            });
          }
        },
        complete: function complete(res) {
          uni.stopPullDownRefresh();
        }
      });
    },
    // 开始搜寻附近的蓝牙外围设备
    bleStartBluetoothDevicesDiscovery: function bleStartBluetoothDevicesDiscovery() {
      var that = this;
      uni.startBluetoothDevicesDiscovery({
        // services: ['FEE7'],  增加条件
        // interval: 0,
        allowDuplicatesKey: false,
        success: function success(res) {
          that.bleOnBluetoothDeviceFound();
        },
        fail: function fail(res) {
          if (res.errMsg == 'startBluetoothDevicesDiscovery:fail already discovering devices') {
            that.bleOnBluetoothDeviceFound();
          } else {
            uni.showToast({
              icon: 'none',
              title: res.errMsg
            });
          }
        }
      });
    },
    // 监听寻找到新设备的事件
    bleOnBluetoothDeviceFound: function bleOnBluetoothDeviceFound() {
      var that = this;
      uni.onBluetoothDeviceFound(function (obj) {
        var list = obj.devices;
        for (var i = 0; i < list.length; i++) {
          that.belDeviceAdd(list[i]);
        }
        that.dataRegularization();
      });
    },
    // 设备加入
    belDeviceAdd: function belDeviceAdd(dev) {
      var selectIdx = -1;
      for (var i = 0; i < this.list.length; i++) {
        var item = this.list[i];
        if (item.deviceId == dev.deviceId) {
          selectIdx = i;
          break;
        }
      }
      if (selectIdx == -1) {
        this.list.push(dev);
      } else {
        this.list[selectIdx] = dev;
      }
    }
  },
  onLoad: function onLoad() {
    // 演示数据，仅模板使用

    this.getSystemInfo();
    this.bleOpenBluetoothAdapter();
  },
  onShow: function onShow() {
    this.show();
  },
  onNavigationBarButtonTap: function onNavigationBarButtonTap(e) {
    this.trigger(e);
  },
  onPullDownRefresh: function onPullDownRefresh() {
    this.refresh();
  },
  onShareAppMessage: function onShareAppMessage() {
    return {
      title: '开源的极致蓝牙调试小工具',
      path: '/pages/tabbar/scanner',
      imageUrl: '/static/logo.png'
    };
  },
  onShareTimeline: function onShareTimeline() {
    return {
      title: '开源的极致蓝牙调试小工具',
      path: '/pages/tabbar/scanner',
      imageUrl: '/static/logo.png'
    };
  }
};
exports.default = _default;
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./node_modules/@dcloudio/uni-mp-weixin/dist/index.js */ 2)["default"]))

/***/ })

},[[36,"common/runtime","common/vendor"]]]);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/tabbar/scanner.js.map