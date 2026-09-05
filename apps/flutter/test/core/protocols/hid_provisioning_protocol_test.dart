// hid_provisioning_protocol.dart 单测 —— 与 TS 镜像逐字段对齐校验
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/protocols/hid_provisioning_protocol.dart';

const validToken = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

void main() {
  group('GATT UUID 常量', () {
    test('服务与三特征 UUID 末段 1001/1002/1003/1004', () {
      expect(smartHidProvisioningServiceUuid.endsWith('1c04'), isTrue);
      for (final u in [
        SmartHidCharacteristicUuids.info,
        SmartHidCharacteristicUuids.input,
        SmartHidCharacteristicUuids.status,
      ]) {
        expect(u.endsWith('1c04'), isTrue);
      }
      expect(SmartHidCharacteristicUuids.info.contains('1002'), isTrue);
      expect(SmartHidCharacteristicUuids.input.contains('1003'), isTrue);
      expect(SmartHidCharacteristicUuids.status.contains('1004'), isTrue);
    });
  });

  group('buildProvisionCandidateJson', () {
    test('合法输入生成含全部字段的 JSON', () {
      final json = buildProvisionCandidateJson(const ProvisionCandidateInput(
        wifiSsid: 'MyWiFi',
        wifiPassword: 'pass1234',
        hubHost: '192.168.1.8',
        hubPort: 17892,
        token: validToken,
      ));
      expect(json, contains('"v":1'));
      expect(json, contains('"wifi_ssid":"MyWiFi"'));
      expect(json, contains('"wifi_password":"pass1234"'));
      expect(json, contains('"hub_host":"192.168.1.8"'));
      expect(json, contains('"hub_port":17892'));
      expect(json, contains('"token":"$validToken"'));
    });

    test('端口缺省 17892', () {
      final json = buildProvisionCandidateJson(const ProvisionCandidateInput(
        wifiSsid: 'x',
        wifiPassword: '',
        hubHost: 'h',
        token: validToken,
      ));
      expect(json, contains('"hub_port":17892'));
    });

    test('SSID 前后空格被 trim，超长/为空抛错', () {
      final json = buildProvisionCandidateJson(const ProvisionCandidateInput(
        wifiSsid: '  x  ',
        wifiPassword: '',
        hubHost: 'h',
        token: validToken,
      ));
      expect(json, contains('"wifi_ssid":"x"'));

      expect(
        () => buildProvisionCandidateJson(const ProvisionCandidateInput(
          wifiSsid: '',
          wifiPassword: '',
          hubHost: 'h',
          token: validToken,
        )),
        throwsFormatException,
      );
      expect(
        () => buildProvisionCandidateJson(ProvisionCandidateInput(
          wifiSsid: 'a' * 33,
          wifiPassword: '',
          hubHost: 'h',
          token: validToken,
        )),
        throwsFormatException,
      );
    });

    test('密码超 64 抛错', () {
      expect(
        () => buildProvisionCandidateJson(ProvisionCandidateInput(
          wifiSsid: 'x',
          wifiPassword: 'p' * 65,
          hubHost: 'h',
          token: validToken,
        )),
        throwsFormatException,
      );
    });

    test('host 为空 / token 形态非法抛错', () {
      expect(
        () => buildProvisionCandidateJson(const ProvisionCandidateInput(
          wifiSsid: 'x',
          wifiPassword: '',
          hubHost: ' ',
          token: validToken,
        )),
        throwsFormatException,
      );
      for (final bad in ['', 'abc', validToken.toUpperCase(), '${validToken}ff']) {
        expect(
          () => buildProvisionCandidateJson(ProvisionCandidateInput(
            wifiSsid: 'x',
            wifiPassword: '',
            hubHost: 'h',
            token: bad,
          )),
          throwsFormatException,
        );
      }
    });

    test('密码特殊字符被 JSON 转义', () {
      final json = buildProvisionCandidateJson(const ProvisionCandidateInput(
        wifiSsid: 'x',
        wifiPassword: 'a"b\\c\nd',
        hubHost: 'h',
        token: validToken,
      ));
      expect(json, contains(r'"wifi_password":"a\"b\\c\nd"'));
    });
  });

  group('parsePairingQrPayload', () {
    test('完整 URI 解析 token/host/port', () {
      final p = parsePairingQrPayload(
          'shid://pair?token=$validToken&host=192.168.1.8&port=17892');
      expect(p, isNotNull);
      expect(p!.token, validToken);
      expect(p.host, '192.168.1.8');
      expect(p.port, 17892);
    });

    test('缺 port 用默认 17892；scheme 大小写不敏感', () {
      final p = parsePairingQrPayload('SHID://pair?token=$validToken&host=hub1');
      expect(p, isNotNull);
      expect(p!.port, 17892);
    });

    test('非 shid scheme / 坏 token / 坏 host / 坏 port 返回 null', () {
      expect(parsePairingQrPayload('http://pair?token=x'), isNull);
      expect(parsePairingQrPayload('shid://pair?token=zz&host=h'), isNull);
      expect(parsePairingQrPayload('shid://pair?token=$validToken'), isNull);
      expect(
          parsePairingQrPayload('shid://pair?token=$validToken&host=a/b'), isNull);
      expect(
          parsePairingQrPayload('shid://pair?token=$validToken&host=h&port=0'),
          isNull);
      expect(
          parsePairingQrPayload('shid://pair?token=$validToken&host=h&port=xx'),
          isNull);
    });

    test('重复参数返回 null', () {
      expect(
        parsePairingQrPayload(
            'shid://pair?token=$validToken&host=h&host=h2'),
        isNull,
      );
    });
  });

  group('parseDeviceInfo / parseProvisionStatus', () {
    test('合法 JSON 解析', () {
      final info = parseDeviceInfo(
          '{"product":"smart-hid","protocol":"1.0","device_id":"HID-5EEDC0DE",'
          '"firmware":"1.2.0","state":"unprovisioned","provisioned":false}');
      expect(info, isNotNull);
      expect(info!.product, 'smart-hid');
      expect(info.provisioned, isFalse);

      final st = parseProvisionStatus(
          '{"state":"provisioning","step":"pairing","error":null}');
      expect(st!.step, 'pairing');
      expect(st.error, isNull);

      final err = parseProvisionStatus(
          '{"state":"error","step":"pairing","error":"pairing_expired"}');
      expect(err!.error, 'pairing_expired');
    });

    test('非法/缺 device_id 返回 null', () {
      expect(parseDeviceInfo('not json'), isNull);
      expect(parseDeviceInfo('{"product":"smart-hid"}'), isNull);
      expect(parseProvisionStatus('[]'), isNull);
    });
  });

  group('verifySmartHidDeviceInfo', () {
    test('product/protocol/device_id 三项全对才通过', () {
      String infoJson(String product, String protocol, String id) =>
          '{"product":"$product","protocol":"$protocol","device_id":"$id",'
          '"firmware":"1","state":"x","provisioned":false}';
      expect(verifySmartHidDeviceInfo(parseDeviceInfo(
              infoJson('smart-hid', '1.0', 'HID-5EEDC0DE'))!),
          isTrue);
      expect(verifySmartHidDeviceInfo(parseDeviceInfo(
              infoJson('other', '1.0', 'HID-5EEDC0DE'))!),
          isFalse);
      expect(verifySmartHidDeviceInfo(parseDeviceInfo(
              infoJson('smart-hid', '1.1', 'HID-5EEDC0DE'))!),
          isFalse);
      expect(verifySmartHidDeviceInfo(parseDeviceInfo(
              infoJson('smart-hid', '1.0', 'HID-short'))!),
          isFalse);
    });
  });

  group('错误码表 / 行映射 / 恢复动作', () {
    test('全部协议错误码都有提示文案', () {
      for (final code in ProvisioningErrorCodes.all) {
        expect(provisioningErrorHints[code], isNotNull,
            reason: '$code 缺提示文案');
      }
    });

    test('错误码 → 行映射', () {
      expect(provisionErrorRow(ProvisioningErrorCodes.wifiFailed), 'wifi');
      expect(provisionErrorRow(ProvisioningErrorCodes.invalidPayload), 'wifi');
      expect(provisionErrorRow(ProvisioningErrorCodes.controlhubUnreachable), 'hub');
      expect(provisionErrorRow(ProvisioningErrorCodes.pairingExpired), 'hub');
      expect(provisionErrorRow(ProvisioningErrorCodes.pairingUsed), 'hub');
      expect(provisionErrorRow(ProvisioningErrorCodes.mqttInvalid), 'conn');
      expect(provisionErrorRow(ProvisioningErrorCodes.storageFailed), 'usb');
      expect(provisionErrorRow(timeoutErrorCode), 'conn');
    });

    test('错误码 → 恢复动作映射（对齐 uni-app smartHidRecoveryAction）', () {
      expect(provisionRecoveryAction(ProvisioningErrorCodes.wifiFailed), 'form');
      expect(provisionRecoveryAction(ProvisioningErrorCodes.invalidPayload), 'form');
      expect(provisionRecoveryAction(ProvisioningErrorCodes.pairingInvalid), 'pairing');
      expect(provisionRecoveryAction(ProvisioningErrorCodes.pairingExpired), 'pairing');
      expect(provisionRecoveryAction(ProvisioningErrorCodes.pairingUsed), 'pairing');
      expect(provisionRecoveryAction(ProvisioningErrorCodes.controlhubUnreachable), 'pairing');
      expect(provisionRecoveryAction(ProvisioningErrorCodes.mqttInvalid), 'diagnostics');
      expect(provisionRecoveryAction(ProvisioningErrorCodes.storageFailed), 'retry');
      expect(provisionRecoveryAction('unknown_code'), 'retry');
    });
  });
}
