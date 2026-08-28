<template>
	<view class="container">
		<view class="page-content">
			<provision-stepper :steps="steps" :current="currentStep" />

			<view v-if="phase === 'connect'" class="panel ble-card">
				<view class="panel-kicker">SMART HID</view>
				<text class="panel-title">连接设备</text>
				<text class="panel-desc">正在建立 BLE 连接并读取 Device Info，确认设备身份后会直接进入配置。</text>
				<view v-if="currentDevice" class="device-card">
					<view class="device-mark">HID</view>
					<view class="device-copy">
						<text class="device-name">{{ currentDevice.name || 'Smart HID' }}</text>
						<text class="device-id">{{ currentDevice.deviceId }}</text>
					</view>
				</view>
				<view v-if="connecting" class="status-line"><view class="status-dot active"></view><text>连接并确认设备中…</text></view>
				<view v-if="connectionError" class="error-box"><text>{{ connectionError }}</text></view>
				<text v-if="connectionError" class="ready-hint">已完成配置（READY）的设备会关闭蓝牙广播；如需重新配置，请先让设备进入配网/恢复模式后重试。</text>
				<button v-if="connectionError && currentDevice" class="primary-btn" :disabled="connecting" @click="connectDevice">重新连接</button>
				<button v-if="connectionError" class="secondary-btn" @click="goDevices">返回设备列表</button>
			</view>

			<view v-if="phase === 'configure'" class="panel ble-card">
				<view class="panel-heading">
					<view><view class="panel-kicker">设备已连接</view><text class="panel-title">填写配网信息</text></view>
					<view class="connected-badge">已连接</view>
				</view>
				<text class="device-summary">{{ deviceInfoSummary }}</text>

				<view class="form-group">
					<text class="form-label">Wi-Fi 名称</text>
					<input class="form-input" type="text" v-model="wifiSsid" maxlength="32" placeholder="请输入 SSID" />
				</view>
				<view class="form-group">
					<text class="form-label">Wi-Fi 密码</text>
					<input class="form-input" type="text" password v-model="wifiPassword" maxlength="64" placeholder="无密码可留空" />
				</view>
				<view class="form-group">
					<view class="label-row"><text class="form-label">ControlHub 地址</text><text class="form-hint">默认端口 17892</text></view>
					<input class="form-input mono" type="text" v-model="hubAddress" placeholder="192.168.1.8:17892" />
				</view>

				<button class="qr-btn" @click="scanControlHubQr">
					<text class="qr-icon">⌁</text>
					<view class="qr-copy">
						<text class="qr-title">{{ pairingReady ? '重新扫描 ControlHub 配对码' : '扫描 ControlHub 配对码' }}</text>
						<text class="qr-desc">{{ pairingReady ? '一次性配对凭据已获取，服务器地址仍可修改' : '自动带入服务器地址和一次性配对凭据' }}</text>
					</view>
					<text class="qr-state">{{ pairingReady ? '已获取' : '必需' }}</text>
				</button>

				<text class="privacy-note">Wi-Fi 密码和配对凭据只用于本次下发，不写入日志或本地存储。</text>
				<button class="primary-btn" :disabled="!canSubmit" @click="provision">下发配置</button>
			</view>

			<view v-if="phase === 'status'" class="panel ble-card">
				<view class="panel-kicker">PROVISION STATUS</view>
				<text class="panel-title">{{ provisionDone ? '配置完成' : provisioning ? '正在配置' : '配置结果' }}</text>
				<text class="panel-desc">设备会依次连接 Wi-Fi、与 ControlHub 配对并建立 MQTT 控制链路。</text>
				<provision-progress :rows="progressRows" />

				<view v-if="provisionDone" class="success-box">
					<view class="success-icon">✓</view>
					<view><text class="success-title">设备已就绪</text><text class="success-desc">HID 控制请通过 ControlHub 下发。</text></view>
				</view>
				<view v-if="errorMessage" class="error-box"><text>{{ errorMessage }}</text></view>
				<button v-if="provisionDone" class="primary-btn" @click="goDetail">查看设备</button>
				<button v-if="errorMessage" class="secondary-btn" @click="runRecovery">{{ recoveryLabel }}</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { onLoad, onUnload } from '@dcloudio/uni-app';
import ProvisionStepper from '../../components/hid/provision-stepper.vue';
import ProvisionProgress from '../../components/hid/provision-progress.vue';
import { useSmartHidProvisioning } from '../../composables/use-smart-hid-provisioning.js';

const {
	steps, phase, currentStep, connecting, connectionError, deviceInfoSummary,
	currentDevice, wifiSsid, wifiPassword, hubAddress, pairingReady,
	provisioning, provisionDone, errorMessage, progressRows, canSubmit,
	recoveryLabel, initialize, connectDevice, scanControlHubQr, provision,
	runRecovery, goDetail, goDevices, dispose
} = useSmartHidProvisioning();

onLoad((options) => { initialize(options); });
onUnload(dispose);
</script>

<style scoped>
.container { min-height: 100vh; background: transparent; }
.page-content { display: flex; flex-direction: column; gap: 22rpx; padding: 28rpx; }
/* 卡片配方（渐变/描边/圆角/阴影）走 ble-card */
.panel { display: flex; flex-direction: column; gap: 20rpx; padding: 30rpx; }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.panel-kicker { margin-bottom: 8rpx; color: var(--ble-brand); font-size: 20rpx; font-weight: 800; letter-spacing: 2rpx; }
.panel-title { display: block; color: var(--ble-text); font-size: 38rpx; font-weight: 800; line-height: 1.2; }
.panel-desc { color: var(--ble-text-subtle); font-size: 25rpx; line-height: 1.65; }
.connected-badge { flex-shrink: 0; padding: 8rpx 14rpx; border-radius: 999rpx; color: #0e8f79; background: rgba(23, 199, 168, 0.16); font-size: 21rpx; font-weight: 700; }
.device-card { display: flex; align-items: center; gap: 18rpx; padding: 22rpx; border-radius: 26rpx; background: rgba(255, 255, 255, 0.84); border: 1rpx solid rgba(20, 76, 136, 0.08); }
.device-mark { display: flex; align-items: center; justify-content: center; width: 82rpx; height: 82rpx; flex-shrink: 0; border-radius: 24rpx; color: #fff; background: var(--ble-gradient-brand); font-size: 23rpx; font-weight: 800; }
.device-copy { min-width: 0; flex: 1; }
.device-name { display: block; color: var(--ble-text); font-size: 28rpx; font-weight: 750; }
.device-id, .device-summary { color: var(--ble-text-muted); font-family: "SF Mono", "Roboto Mono", Menlo, monospace; font-size: 21rpx; line-height: 1.5; word-break: break-all; }
.device-id { display: block; margin-top: 6rpx; }
.status-line { display: flex; align-items: center; gap: 12rpx; color: var(--ble-text-subtle); font-size: 24rpx; }
.status-dot { width: 18rpx; height: 18rpx; border-radius: 50%; background: var(--ble-text-muted); }
.status-dot.active { background: var(--ble-brand); box-shadow: 0 0 0 8rpx rgba(27, 109, 255, 0.1); }
.form-group { display: flex; flex-direction: column; gap: 10rpx; }
.label-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.form-label { color: var(--ble-text); font-size: 25rpx; font-weight: 700; }
.form-hint { color: var(--ble-text-muted); font-size: 20rpx; }
.form-input { box-sizing: border-box; width: 100%; height: 86rpx; padding: 0 22rpx; border: 1rpx solid rgba(20, 76, 136, 0.1); border-radius: 22rpx; color: var(--ble-text); background: rgba(247, 250, 253, 0.96); font-size: 26rpx; }
.mono { font-family: "SF Mono", "Roboto Mono", Menlo, monospace; }
.qr-btn { display: grid; grid-template-columns: 56rpx 1fr auto; align-items: center; gap: 14rpx; min-height: 108rpx; margin: 2rpx 0 0; padding: 18rpx 20rpx; border: 1rpx solid rgba(27, 109, 255, 0.14); border-radius: 24rpx; color: var(--ble-text); background: rgba(27, 109, 255, 0.07); text-align: left; }
.qr-btn::after, .primary-btn::after, .secondary-btn::after { border: none; }
.qr-icon { display: flex; align-items: center; justify-content: center; width: 52rpx; height: 52rpx; border-radius: 16rpx; color: #fff; background: var(--ble-gradient-brand); font-size: 30rpx; font-weight: 800; }
.qr-copy { min-width: 0; }
.qr-title { display: block; font-size: 25rpx; font-weight: 750; }
.qr-desc { display: block; margin-top: 5rpx; color: var(--ble-text-subtle); font-size: 20rpx; line-height: 1.45; }
.qr-state { color: var(--ble-brand); font-size: 21rpx; font-weight: 750; }
.privacy-note { color: var(--ble-text-muted); font-size: 21rpx; line-height: 1.55; }
.primary-btn, .secondary-btn { display: flex; align-items: center; justify-content: center; height: 88rpx; border: none; border-radius: 999rpx; font-size: 28rpx; font-weight: 750; }
.primary-btn { color: #fff; background: var(--ble-gradient-brand); box-shadow: 0 18rpx 42rpx rgba(27, 109, 255, 0.18); }
.secondary-btn { color: var(--ble-brand); background: rgba(27, 109, 255, 0.08); }
.primary-btn[disabled] { opacity: 0.5; box-shadow: none; }
.error-box { padding: 20rpx 22rpx; border: 1rpx solid rgba(242, 85, 95, 0.14); border-radius: 22rpx; color: var(--ble-red); background: rgba(242, 85, 95, 0.08); font-size: 24rpx; line-height: 1.55; }
.ready-hint { color: #d37a12; font-size: 22rpx; line-height: 1.55; }
.success-box { display: flex; align-items: center; gap: 18rpx; padding: 22rpx; border-radius: 24rpx; color: #087765; background: rgba(23, 199, 168, 0.12); }
.success-icon { display: flex; align-items: center; justify-content: center; width: 58rpx; height: 58rpx; flex-shrink: 0; border-radius: 50%; color: #fff; background: #17b99b; font-size: 30rpx; font-weight: 800; }
.success-title { display: block; font-size: 27rpx; font-weight: 800; }
.success-desc { display: block; margin-top: 4rpx; font-size: 22rpx; }
</style>
