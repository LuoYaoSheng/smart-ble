<template>
  <view class="ble-shell privacy-shell">
    <AppSubnav title="隐私说明" @back="goBack" />
    <scroll-view scroll-y class="privacy-scroll">
      <view class="privacy-body">
        <text v-for="(block, index) in blocks" :key="index" selectable :class="block.startsWith('#') ? 'policy-heading' : 'policy-paragraph'">{{ block.replace(/^#+ /, '') }}</text>
      </view>
    </scroll-view>
  </view>
</template>
<script setup>
import AppSubnav from '../../components/ui/AppSubnav.vue';
import { PRIVACY_POLICY } from '../../config/privacy-policy.js';
const blocks = PRIVACY_POLICY.trim().split(/\n\n+/);
const goBack = () => uni.navigateBack();
</script>
<style scoped>
.privacy-scroll { flex: 1; min-height: 0; }
.privacy-body { padding: 32rpx; max-width: 760px; margin: 0 auto; }
.policy-heading, .policy-paragraph { display: block; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--ble-text); }
.policy-heading { margin: 26rpx 0 16rpx; font-size: 32rpx; font-weight: 700; }
.policy-paragraph { margin: 18rpx 0; font-size: 26rpx; line-height: 1.7; }
</style>
