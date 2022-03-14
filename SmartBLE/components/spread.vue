<template>
	<view class="spread" :style="{height: h + 'px'}">
		<view class="dot" :style="{height: dotW + 'px',width: dotW + 'px', left: dotL + 'px', top: dotT + 'px'}"></view>
		<view class="pulse"
			:style="{height: pulseW + 'px',width: pulseW + 'px', left: pulseL + 'px', top: pulseT + 'px'}"></view>
		<view class="pulse1"
			:style="{height: pulse1W + 'px',width: pulse1W + 'px', left: pulse1L + 'px', top: pulse1T + 'px'}"></view>
	</view>
</template>

<script>
	export default {
		name: "spread",
		data() {
			return {}
		},
		computed: {
			dotW: function() {
				return this.w * 0.2
			},
			dotL: function() {
				return (this.w - this.dotW) * 0.5
			},
			dotT: function() {
				return (this.h - this.dotW) * 0.5
			},
			pulseW: function() {
				return this.w * 0.5
			},
			pulseL: function() {
				return (this.w - this.pulseW) * 0.5
			},
			pulseT: function() {
				return (this.h - this.pulseW) * 0.5 - this.dotW
			},
			pulse1W: function() {
				return this.w * 0.9
			},
			pulse1L: function() {
				return (this.w - this.pulse1W) * 0.5
			},
			pulse1T: function() {
				return (this.h - this.pulse1W) * 0.5 - this.pulseW - this.dotW
			},
		},
		props: {
			w: {
				type: Number,
				value: 0
			},
			h: {
				type: Number,
				value: 0
			}
		}
	}
</script>

<style>
	.spread {
		width: 100%;
	}

	.dot {
		background: linear-gradient(350deg, #C2E9FB 0%, #A1C4FD 100%);
		box-shadow: 0rpx 0rpx 4rpx 1rpx #D4E3F6;
		z-index: 2;
		position: relative;
		-webkit-border-radius: 50%;
		-moz-border-radius: 50%;
		border-radius: 50%;
	}

	.pulse {
		background: linear-gradient(350deg, #C2E9FB 0%, #A1C4FD 100%);
		box-shadow: 0rpx 0rpx 4rpx 1rpx #D4E3F6;
		z-index: 1;
		position: relative;
		-webkit-border-radius: 50%;
		-moz-border-radius: 50%;
		border-radius: 50%;
		opacity: 0;
		-webkit-animation: warn 2s ease-out;
		-moz-animation: warn 2s ease-out;
		animation: warn 2s ease-out;
		-webkit-animation-iteration-count: infinite;
		-moz-animation-iteration-count: infinite;
		animation-iteration-count: infinite;
	}

	.pulse1 {
		background: linear-gradient(350deg, #C2E9FB 0%, #A1C4FD 100%);
		box-shadow: 0rpx 0rpx 4rpx 1rpx #D4E3F6;
		z-index: 0;
		position: relative;
		-webkit-border-radius: 50%;
		-moz-border-radius: 50%;
		border-radius: 50%;
		opacity: 0;
		-webkit-animation: warn 2s ease-out;
		-moz-animation: warn 2s ease-out;
		animation: warn 2s ease-out;
		-webkit-animation-iteration-count: infinite;
		-moz-animation-iteration-count: infinite;
		animation-iteration-count: infinite;
	}

	@keyframes warn {
		0% {
			transform: scale(0.3);
			-webkit-transform: scale(0.3);
			opacity: 0.0;
		}

		25% {
			transform: scale(0.3);
			-webkit-transform: scale(0.3);
			opacity: 0.1;
		}

		50% {
			transform: scale(0.5);
			-webkit-transform: scale(0.5);
			opacity: 0.3;
		}

		75% {
			transform: scale(0.8);
			-webkit-transform: scale(0.8);
			opacity: 0.5;
		}

		100% {
			transform: scale(1);
			-webkit-transform: scale(1);
			opacity: 0.0;
		}
	}

	@keyframes warn1 {
		0% {
			transform: scale(0.3);
			-webkit-transform: scale(0.3);
			opacity: 0.0;
		}

		25% {
			transform: scale(0.3);
			-webkit-transform: scale(0.3);
			opacity: 0.1;
		}

		50% {
			transform: scale(0.3);
			-webkit-transform: scale(0.3);
			opacity: 0.3;
		}

		75% {
			transform: scale(0.5);
			-webkit-transform: scale(0.5);
			opacity: 0.5;
		}

		100% {
			transform: scale(0.8);
			-webkit-transform: scale(0.8);
			opacity: 0.0;
		}
	}
</style>
