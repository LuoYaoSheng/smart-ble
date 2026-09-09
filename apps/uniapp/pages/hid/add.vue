<template>
	<view class="container">
		<AppSubnav title="配置 Smart HID" @back="onSubnavBack" />
		<view class="page-content">
			<provision-stepper :steps="steps" :current="currentStep" />

			<view v-if="phase === 'connect'" class="panel">
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
				<view v-if="connecting" class="status-wrap">
					<operation-state state="loading" title="连接并确认设备中…" />
				</view>
				<operation-state
					v-if="connectionError"
					state="error"
					:description="connectionError"
				/>
				<button v-if="connectionError && currentDevice" class="ble-btn ble-btn--primary ble-btn--lg ble-btn--block" :class="{ 'ble-btn--busy': connecting }" :disabled="connecting" @click="connectDevice">重新连接</button>
				<button v-if="connectionError" class="ble-btn ble-btn--secondary ble-btn--lg ble-btn--block" @click="goDevices">返回设备列表</button>
			</view>

			<view v-if="phase === 'configure'" class="panel">
				<view class="panel-heading">
					<view><view class="panel-kicker">{{ connectionLost ? '设备连接已断开' : '设备已连接' }}</view><text class="panel-title">填写配网信息</text></view>
					<view :class="['connected-badge', { lost: connectionLost }]">{{ connectionLost ? '已断开' : '已连接' }}</view>
				</view>
				<text class="device-summary">{{ deviceInfoSummary }}</text>

				<operation-state
					v-if="connectionLost"
					state="error"
					description="设备 BLE 连接已断开。重新连接后可继续下发，已填写的配网信息不会丢失。"
				/>
				<button v-if="connectionLost" class="ble-btn ble-btn--primary ble-btn--lg ble-btn--block" :class="{ 'ble-btn--busy': connecting }" :disabled="connecting" @click="connectDevice">{{ connecting ? '重连中…' : '重新连接设备' }}</button>

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

				<button class="ble-action-card-btn" @click="scanControlHubQr">
					<view class="ble-action-card-btn__icon"><AppIcon name="qr" :size="30" tone="card" /></view>
					<view class="ble-action-card-btn__copy">
						<text class="ble-action-card-btn__title">{{ pairingReady ? '重新扫描 ControlHub 配对码' : '扫描 ControlHub 配对码' }}</text>
						<text class="ble-action-card-btn__desc">{{ pairingReady ? '一次性配对凭据已获取，服务器地址仍可修改' : '自动带入服务器地址和一次性配对凭据' }}</text>
					</view>
					<text class="ble-action-card-btn__badge">{{ pairingReady ? '已获取' : '必需' }}</text>
				</button>

				<text class="privacy-note">Wi-Fi 密码和配对凭据只用于本次下发，不写入日志或本地存储。</text>
				<button class="ble-btn ble-btn--primary ble-btn--lg ble-btn--block" :class="{ 'ble-btn--disabled': !canSubmit }" :disabled="!canSubmit" @click="provision">下发配置</button>
			</view>

			<view v-if="phase === 'status'" class="panel">
				<view class="panel-kicker">PROVISION STATUS</view>
				<text class="panel-title">{{ provisionDone ? '配置完成' : provisioning ? '正在配置' : '配置结果' }}</text>
				<text class="panel-desc">设备会依次连接 Wi-Fi、与 ControlHub 配对并建立 MQTT 控制链路。</text>
				<provision-progress :rows="progressRows" />

				<view v-if="provisionDone" class="success-wrap">
					<operation-state
						state="success"
						title="设备已就绪"
						description="HID 控制请通过 ControlHub 下发。"
					/>
				</view>
				<operation-state
					v-if="errorMessage"
					state="error"
					:description="errorMessage"
				/>
				<button v-if="provisioning" class="ble-btn ble-btn--ghost ble-btn--lg ble-btn--block" @click="cancelWaiting">取消等待</button>
				<button v-if="provisionDone" class="ble-btn ble-btn--primary ble-btn--lg ble-btn--block" @click="goDetail">查看设备</button>
				<button v-if="errorMessage" class="ble-btn ble-btn--secondary ble-btn--lg ble-btn--block" @click="runRecovery">{{ recoveryLabel }}</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { onLoad, onUnload, onBackPress } from '@dcloudio/uni-app';
import ProvisionStepper from '../../components/hid/provision-stepper.vue';
import ProvisionProgress from '../../components/hid/provision-progress.vue';
import OperationState from '../../components/common/operation-state.vue';
import AppSubnav from '../../components/ui/AppSubnav.vue';
import AppIcon from '../../components/ui/AppIcon.vue'; // UI-PARITY-G0 正典图标入口
import { useSmartHidProvisioning } from '../../composables/use-smart-hid-provisioning.js';

const {
	steps, phase, currentStep, connecting, connectionError, connectionLost, deviceInfoSummary,
	currentDevice, wifiSsid, wifiPassword, hubAddress, pairingReady,
	provisioning, provisionDone, errorMessage, progressRows, canSubmit,
	recoveryLabel, initialize, connectDevice, scanControlHubQr, provision,
	cancelWaiting, confirmLeaveIfNeeded, runRecovery, goDetail, goDevices, dispose
} = useSmartHidProvisioning();

onLoad((options) => { initialize(options); });
onUnload(dispose);

// Subnav 返回与系统返回共用 U-01 离开确认（配网中 / configure 脏表单 → modal 确认）
const onSubnavBack = () => {
	confirmLeaveIfNeeded().then((allowed) => {
		if (allowed) uni.navigateBack();
	});
};

onBackPress(() => {
	if (!provisioning.value) return false;
	onSubnavBack();
	return true;
});
</script>

<style scoped>
.container { min-height: 100vh; background: transparent; }
.page-content { display: flex; flex-direction: column; gap: 22rpx; padding: 28rpx; }
.panel { display: flex; flex-direction: column; gap: 20rpx; padding: 30rpx; border: 1rpx solid var(--ble-line); border-radius: var(--ble-radius-lg); background: var(--ble-gradient-surface); box-shadow: var(--ble-shadow-soft); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.panel-kicker { margin-bottom: 8rpx; color: var(--ble-brand); font-size: 20rpx; font-weight: 800; letter-spacing: 2rpx; }
.panel-title { display: block; color: var(--ble-text); font-size: 38rpx; font-weight: 800; line-height: 1.2; }
.panel-desc { color: var(--ble-text-subtle); font-size: 25rpx; line-height: 1.65; }
.connected-badge { flex-shrink: 0; padding: 8rpx 14rpx; border-radius: 999rpx; color: var(--c-success-deep); background: rgba(23, 199, 168, 0.16); font-size: 21rpx; font-weight: 700; }
.connected-badge.lost { color: var(--ble-red); background: rgba(242, 85, 95, 0.12); }
.device-card { display: flex; align-items: center; gap: 18rpx; padding: 22rpx; border-radius: var(--ble-radius-md); background: rgba(255, 255, 255, 0.84); border: 1rpx solid var(--ble-line-soft); }
.device-mark { display: flex; align-items: center; justify-content: center; width: 82rpx; height: 82rpx; flex-shrink: 0; border-radius: 24rpx; color: var(--c-card); background: var(--ble-gradient-brand); font-size: 23rpx; font-weight: 800; }
.device-copy { min-width: 0; flex: 1; }
.device-name { display: block; color: var(--ble-text); font-size: 28rpx; font-weight: 750; }
.device-id, .device-summary { color: var(--ble-text-muted); font-family: "SF Mono", "Roboto Mono", Menlo, monospace; font-size: 21rpx; line-height: 1.5; word-break: break-all; }
.device-id { display: block; margin-top: 6rpx; }
.form-group { display: flex; flex-direction: column; gap: 10rpx; }
.label-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.form-label { color: var(--ble-text); font-size: 25rpx; font-weight: 700; }
.form-hint { color: var(--ble-text-muted); font-size: 20rpx; }
.form-input { box-sizing: border-box; width: 100%; height: 86rpx; padding: 0 22rpx; border: 1rpx solid var(--ble-line); border-radius: 22rpx; color: var(--ble-text); background: var(--ble-input-bg); font-size: 26rpx; }
.mono { font-family: "SF Mono", "Roboto Mono", Menlo, monospace; }
.privacy-note { color: var(--ble-text-muted); font-size: 21rpx; line-height: 1.55; }
</style>
