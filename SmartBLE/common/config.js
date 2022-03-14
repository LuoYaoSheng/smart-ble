const Conf = {
	// 域名
	ApiUrl: 'https://LightBLE.i2kai.com',
	GitHubUrl: 'https://github.com/LuoYaoSheng/SimpleBLE',
	FeedbackUrl: 'https://github.com/LuoYaoSheng/SimpleBLE/issues',
	PrivacyPolicyUrl: 'https://github.com/LuoYaoSheng/SimpleBLE/wiki/privacy',
	EvaluateUrl: 'https://i2kai.com',

	// 默认值
	FilterName: '', // 过滤器 - 名称
	FilterUUID: '', // 过滤器 - UUID
	FilterRSSI: -100, // 过滤器 - RSSI
	FilterEmpty: false, // 过滤器 - 空名过滤

	LogFormat: 0, // 0：HEX , 1：ASCII
	LogSimplify: false, // 是否简化
	LogAutoRoll: true, // 是否自动滚动
	LogFileName: 'log_ble_file', // Log存储文件名

	RspModel: 0, // 响应模式：0：被写入，1：循环
	RspStep: 50, // 响应间隔，毫秒

	ScanStep: 30, // 扫描间隔，秒
	ConnectAutoStop: true, // 连接后是否停止扫描
}

const LogType = {
	Connent: 1, // 已连接
	NoticeOpen: 2, //Notification开启
	CharacteristicRead: 3, //读取特征值
	MsgRead: 4, //接收信息
	NoticeRead: 5, //通知消息
	MsgWrite: 6, //写入消息
	Error: 10, //错误
}

export default {
	Conf,
	LogType
}
