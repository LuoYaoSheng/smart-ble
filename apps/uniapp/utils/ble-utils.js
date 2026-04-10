// 常见蓝牙服务 UUID 映射
export const BLE_SERVICES = {
    '1800': '通用访问',
    '1801': '通用属性',
    '180A': '设备信息',
    '180F': '电池服务',
    '1812': '人机接口设备',
    '1813': '扫描参数',
    '1819': '位置和导航',
    // 自定义服务可以在这里添加
};

// 常见蓝牙特征值 UUID 映射
export const BLE_CHARACTERISTICS = {
    '2A00': '设备名称',
    '2A01': '外观',
    '2A02': '外围隐私标志',
    '2A03': '重新连接地址',
    '2A04': '外围首选连接参数',
    '2A05': '服务更改',
    '2A23': '系统ID',
    '2A24': '型号',
    '2A25': '序列号',
    '2A26': '固件版本',
    '2A27': '硬件版本',
    '2A28': '软件版本',
    '2A29': '制造商名称',
    '2A19': '电池电量',
    // 自定义特征值可以在这里添加
};

// 获取格式化的UUID（去除破折号）
export const formatUUID = (uuid) => {
    return uuid.replace(/-/g, '').toUpperCase();
};

// 获取短UUID（如果是标准UUID则返回最后4位，否则返回完整UUID）
export const getShortUUID = (uuid) => {
    const formattedUUID = formatUUID(uuid);
    if (formattedUUID.length === 32 && formattedUUID.startsWith('0000') && formattedUUID.endsWith('00001000800000805F9B34FB')) {
        return formattedUUID.substring(4, 8);
    }
    return formattedUUID;
};

// 获取服务名称
export const getServiceName = (uuid) => {
    const shortUUID = getShortUUID(uuid);
    return BLE_SERVICES[shortUUID] || '未知服务';
};

// 获取特征值名称
export const getCharacteristicName = (uuid) => {
    const shortUUID = getShortUUID(uuid);
    return BLE_CHARACTERISTICS[shortUUID] || '未知特征值';
}; 