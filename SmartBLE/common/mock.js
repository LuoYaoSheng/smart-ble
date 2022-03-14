const devices = [{
		name: '设备1-满格',
		deviceId: '213456',
		RSSI: -1,
		advertisData: [],
		advertisServiceUUIDs: [],
		localName: '',
		serviceData: {}
	},
	{
		name: '设备2-3格',
		deviceId: '213456',
		RSSI: -66,
		advertisData: [],
		advertisServiceUUIDs: [],
		localName: '',
		serviceData: {}
	},
	{
		name: '设备2-2格',
		deviceId: '213456',
		RSSI: -75,
		advertisData: [],
		advertisServiceUUIDs: [],
		localName: '',
		serviceData: {}
	},
	{
		name: '设备2-1格',
		deviceId: '213456',
		RSSI: -86,
		advertisData: [],
		advertisServiceUUIDs: [],
		localName: '',
		serviceData: {}
	},
	{
		name: '设备2-0格',
		deviceId: '213456',
		RSSI: -99,
		advertisData: [],
		advertisServiceUUIDs: [],
		localName: '',
		serviceData: {}
	},
]

const services = [{
		UUID: 'D0611E78-BBB4-4591-A5F8-487910AE4366',
		characteristics: [{
			"properties": {
				"indicate": false,
				"notify": false,
				"read": false,
				"write": true
			},
			"uuid": "00002A39-0000-1000-8000-00805F9B34FB"
		}, {
			"properties": {
				"indicate": false,
				"notify": true,
				"read": true,
				"write": true
			},
			"uuid": "00002A38-0000-1000-8000-00805F9B34FB"
		}, {
			"properties": {
				"indicate": false,
				"notify": false,
				"read": true,
				"write": true
			},
			"uuid": "00002A37-0000-1000-8000-00805F9B34FB"
		}]
	},
	{
		UUID: '0000180A-0000-1000-8000-00805F9B34FB',
		characteristics: [{
			"properties": {
				"indicate": false,
				"notify": true,
				"read": false,
				"write": true
			},
			"uuid": "8667556C-9A37-4C91-84ED-54EE27D90049"
		}]
	}
]

const logs = [{
	"time": 1647180664505,
	"type": 1,
	"id": "8A6BD21C-CE1C-7409-D31D-B1C847723B7E",
	"msg": ""
}, {
	"time": 1647182664736,
	"type": 2,
	"id": "8A6BD21C-CE1C-7409-D31D-B1C847723B7E",
	"msg": ""
}, {
	"time": 1647182686511,
	"type": 3,
	"id": "8A6BD21C-CE1C-7409-D31D-B1C847723B7E",
	"msg": ""
}, {
	"time": 1647182686549,
	"type": 4,
	"id": "8A6BD21C-CE1C-7409-D31D-B1C847723B7E",
	"msg": "QQ: 1034639560"
}, {
	"time": 1647182697139,
	"type": 4,
	"id": "8A6BD21C-CE1C-7409-D31D-B1C847723B7E",
	"msg": "4d6163426f6f6b50726f31352c32"
}]


export default {
	devices,
	services,
	logs
}
