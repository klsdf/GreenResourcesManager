<template>
  <div class="content">
      <div class="content-wrapper" v-if="bookAvailable && navigation && navigation.toc">
          <div class="content-item" v-for="(item,index) in navigation.toc" :key="index"
            @click="jumpTo(item.href)">
            <span class="text">{{item.label}}</span>
          </div>
      </div>
      <div class="empty" v-else>{{ $lt('加载中...') }}</div>
  </div>
</template>
<script>
export default {
    props:{
        ifShowContent:Boolean,
        navigation:Object,
        bookAvailable:Boolean
    },
    methods:{
        jumpTo(target){
            this.$emit('jumpTo',target)
        }
    }
}
</script>

<style scoped lang='scss'>
/* Mixin */
@mixin center() {
  display: flex;
  justify-content: center;
  align-items: center;
}

.content{
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 0;
    background: var(--bg-secondary, white);
    display: flex;
    flex-direction: column;
    .content-wrapper{
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        .content-item{
            padding: 15px 20px;
            border-bottom: 1px solid var(--border-color, #f4f4f4);
            cursor: pointer;
            transition: background 0.2s ease;
            &:hover {
                background: var(--bg-tertiary, #f5f5f5);
            }
            &:last-child {
                border-bottom: none;
            }
            .text{
                font-size: 15px;
                color: var(--text-primary, #333);
                line-height: 1.5;
            }
        }
    }
    .empty{
        width: 100%;
        height: 100%;
        @include center;
        font-size: 16px;
        color: var(--text-secondary, #666);
    }
}
</style>

