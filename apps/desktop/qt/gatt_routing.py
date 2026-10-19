"""Resolve an actual GATT handle by service ownership, never by an ambiguous UUID."""

def canonical(uuid):
    value = str(uuid or '').replace('-', '').lower()
    if len(value) == 4: value = '0000' + value + '00001000800000805f9b34fb'
    elif len(value) == 8: value += '00001000800000805f9b34fb'
    return value


def key(service, characteristic):
    return canonical(service), canonical(characteristic)


def resolve_characteristic(client, service_uuid, characteristic_uuid):
    services = list(client.services)
    if service_uuid:
        services = [service for service in services if canonical(service.uuid) == canonical(service_uuid)]
        if len(services) != 1:
            raise ValueError('服务未找到或存在多个同 UUID 服务实例，请重新发现设备')
    matches = [char for service in services for char in service.characteristics if canonical(char.uuid) == canonical(characteristic_uuid)]
    if len(matches) != 1:
        raise ValueError('特征未找到或 UUID 不唯一，请指定服务和特征实例')
    return matches[0]
