<template>
	<view class="bg flex flex-row align-center justify-between color-text-subtitle">
		<view class="item font-size-subcontent" :class="{'color-text-base color-fill-primary': !value}"
			@click="clickAction(0)">{{leftText}}
		</view>
		<view class="item font-size-subcontent" :class="{'color-text-base color-fill-primary': value}"
			@click="clickAction(1)">{{rightText}}
		</view>
	</view>
</template>

<script>
	export default {
		name: "sk-switch",
		data() {
			return {

			}
		},
		props: {
			leftText: {
				type: String,
				default: '左'
			},
			rightText: {
				type: String,
				default: '右'
			},
			value: {
				type: Number,
				default: 0
			}
		},
		methods: {
			clickAction: function(idx) {
				// this.value = idx
				this.$emit('change', idx)
			}
		}
	}
</script>

<style>
	.bg {
		border-radius: 31rpx;
		border: 1rpx solid #1677FF;
		padding: 4rpx;
	}

	.item {
		width: 90rpx;
		height: 54rpx;
		border-radius: 31rpx;
		text-align: center;
		line-height: 54rpx;
	}
</style>
