import $C from '@/common/config.js';

// udid
function udid() {
	return Math.random().toString(16).substr(2, 8)
}

// 秒格式转化
function secText(sec) {
	if (sec == 0) {
		return 'Never'
	} else if (sec < 60) {
		return sec + ' Sec'
	} else {
		return (sec / 60) + ' Min'
	}
}

function ab2hex(buffer) {
	const hexArr = Array.prototype.map.call(
		new Uint8Array(buffer),
		function(bit) {
			return ('00' + bit.toString(16)).slice(-2)
		}
	)
	return hexArr.join('')
}

// 字符串转为ArrayBuffer对象，参数为字符串
function str2ab(str) {
	// 首先将字符串转为16进制
	let val = ""
	for (let i = 0; i < str.length; i++) {
		if (val === '') {
			val = str.charCodeAt(i).toString(16)
		} else {
			val += ',' + str.charCodeAt(i).toString(16)
		}
	}
	// 将16进制转化为ArrayBuffer
	return new Uint8Array(val.match(/[\da-f]{2}/gi).map(function(h) {
		return parseInt(h, 16)
	})).buffer
}

function hex_to_ascii(str1) {
	var hex = str1.toString()
	var str = ""
	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16))
	}
	return str
}

function ascii_to_hex(str) {
	var arr1 = [];
	for (var n = 0, l = str.length; n < l; n++) {
		var hex = Number(str.charCodeAt(n)).toString(16)
		arr1.push(hex)
	}
	return arr1.join('')
}


// 接口声明区
export default {
	udid,
	secText,
	ab2hex,
	str2ab,
	hex_to_ascii,
	ascii_to_hex
}
