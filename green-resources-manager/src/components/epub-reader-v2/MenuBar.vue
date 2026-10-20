<template> 
       <div class="menu-bar">
            <div class="menu-wrapper" :class="{'hide-box-shadow':ifSettingShow}">
                <div class="icon-wrapper">
                <span class="icon-bright icon" @click="showSetting(1)"></span>
                </div>
                <div class="icon-wrapper">
                    <span class="icon-a icon" @click="showSetting(0)">A</span>
                </div>
                <!-- 暂时隐藏字体颜色选项 -->
                <!-- <div class="icon-wrapper">
                    <span class="icon-color icon" @click="showSetting(2)">🎨</span>
                </div> -->
            </div>
            <transition name="slide-left">
                <div class="setting-wrapper" v-show="ifSettingShow">
                <div class="setting-header">
                    <span class="setting-title">{{ getSettingTitle() }}</span>
                    <button class="btn-close-setting" @click="hideSetting" :title="$lt('关闭')">
                        <span class="close-icon">✕</span>
                    </button>
                </div>
                <div class="setting-font-size" v-if="showTag === 0">
                    <ul class="font-size-list">
                        <li 
                            v-for="(item,index) in fontSizeList" 
                            :key="index"
                            class="font-size-item"
                            :class="{'active': defaultFontSize === item.fontSize}"
                            @click="setFontSize(item.fontSize)">
                            <span class="font-size-preview" :style="{fontSize: item.fontSize + 'px'}">A</span>
                            <span class="font-size-value">{{ item.fontSize }}px</span>
                            <span class="font-size-check" v-if="defaultFontSize === item.fontSize">✓</span>
                        </li>
                    </ul>
                </div>
                <div class="setting-theme" v-else-if="showTag === 1">
                    <div class="setting-theme-item" v-for="(item,index) in themeList" :key="index"
                    @click="setTheme(index)">
                        <div class="preview" :style="{background:item.style.body.background}"
                        :class="{'no-border':item.style.body.background!=='#fff'}"></div>
                        <div class="text" :class="{'selected':index=== defaultTheme}">{{item.name}}</div>
                    </div>
                </div>
                <div class="setting-font-color" v-else-if="showTag === 2">
                    <ul class="font-color-list">
                        <li 
                            v-for="(item,index) in fontColorList" 
                            :key="index"
                            class="font-color-item"
                            :class="{'active': defaultFontColor === item.color}"
                            @click="setFontColor(item.color)">
                            <span class="font-color-preview" :style="{color: item.color}">A</span>
                            <span class="font-color-name">{{ item.name }}</span>
                            <span class="font-color-check" v-if="defaultFontColor === item.color">✓</span>
                        </li>
                    </ul>
                </div>
            </div>
            </transition>
       </div>
</template>
<script>
export default {
    props:{
        ifTitleAndMenuShow :{
            type:Boolean,
            default:false
        },
        fontSizeList:Array,
        defaultFontSize:Number,
        themeList:Array,
        defaultTheme:Number,
        fontColorList:Array,
        defaultFontColor:String,
        bookAvailable : {
            type: Boolean,
            default:false
        }
    },
    data(){
        return{
            ifSettingShow:false,
            showTag: 0,
        }
    },
    watch:{
        bookAvailable:{
            handler:function(){
                this.getCurrentLocation()
            }
        },
    },
    methods:{
        getCurrentLocation(){
            this.$emit('getCurrentLocation')
        },
        jumpTo(target){
            this.$emit('jumpTo',target)
        },
        setTheme(index){
            this.$emit('setTheme',index)
        },
        setFontSize(fontSize){
            this.$emit('setFontSize',fontSize)
        },
        setFontColor(color){
            this.$emit('setFontColor',color)
        },
        showSetting(tag){
            // 如果点击的是同一个按钮且菜单已打开，则关闭
            if(this.showTag === tag && this.ifSettingShow){
                this.hideSetting()
            } else {
                this.showTag = tag
                this.ifSettingShow = true
            }
        },
        getSettingTitle(){
            switch(this.showTag){
                case 0:
                    return '字体大小'
                case 1:
                    return '背景颜色'
                case 2:
                    return '字体颜色'
                default:
                    return '设置'
            }
        },
        hideSetting(){
            this.ifSettingShow = false
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

/* Icon样式 */
.icon-bright::before {
  content: "☀";
}

[class^="icon-"], [class*=" icon-"] {
  display: inline-block;
  font-style: normal;
  font-weight: normal;
  line-height: 1;
  vertical-align: middle;
}

.icon {
  color: #333;
  font-size: 28px;
  display: inline-block;
}

/* 过渡动画 */
.slide-left-enter, .slide-left-leave-to {
  transform: translate3d(100%, 0, 0);
}
.slide-left-enter-to, .slide-left-leave {
  transform: translate3d(0, 0, 0);
}
.slide-left-enter-active, .slide-left-leave-active {
  transition: all .3s linear;
}

    .menu-bar{
        position: relative;
        width: 60px;
        height: 100%;
        flex-shrink: 0;
        background: var(--bg-secondary, #f5f5f5);
        border-left: 1px solid var(--border-color, #e0e0e0);
        display: flex;
        flex-direction: column;
        
        .menu-wrapper{
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            z-index: 10;
            background: var(--bg-secondary, #f5f5f5);
            box-shadow: -2px 0 8px rgba(0,0,0,.1);
            &.hide-box-shadow{
                box-shadow: none;
            }
            .icon-wrapper{
                flex: 0 0 60px;
                width: 100%;
                @include center;
                cursor: pointer;
                border-bottom: 1px solid var(--border-color, #e0e0e0);
                transition: background 0.2s ease;
                &:hover {
                    background: var(--bg-tertiary, #e8e8e8);
                }
                &:last-child {
                    border-bottom: none;
                }
                .icon {
                    font-size: 24px;
                    color: var(--text-primary, #333);
                }
                .icon-a{
                    font-size: 20px;
                    font-weight: 600;
                }
            }
        }        
        .setting-wrapper{
            position: absolute;
            top: 0;
            right: 60px;
            z-index: 11;
            width: 300px;
            height: 100%;
            background: var(--bg-secondary, white);
            box-shadow: -2px 0 8px rgba(0,0,0,.15);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            
            .setting-header{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid var(--border-color, #e0e0e0);
                background: var(--bg-tertiary, #f5f5f5);
                flex-shrink: 0;
                
                .setting-title{
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary, #333);
                }
                
                .btn-close-setting{
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background 0.2s ease;
                    
                    &:hover{
                        background: var(--bg-secondary, #e8e8e8);
                    }
                    
                    .close-icon{
                        font-size: 18px;
                        color: var(--text-secondary, #666);
                        line-height: 1;
                    }
                }
            }
            
            .setting-font-size{
                display: flex;
                flex-direction: column;
                padding: 20px;
                flex: 1;
                min-height: 0;
                overflow: hidden;
                
                .font-size-list{
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    
                    .font-size-item{
                        display: flex;
                        align-items: center;
                        padding: 12px 15px;
                        margin-bottom: 8px;
                        border: 1px solid var(--border-color, #e0e0e0);
                        border-radius: 6px;
                        background: var(--bg-tertiary, #f5f5f5);
                        cursor: pointer;
                        transition: all 0.2s ease;
                        
                        &:hover{
                            background: var(--bg-secondary, #e8e8e8);
                            border-color: var(--accent-color, #66c0f4);
                        }
                        
                        &.active{
                            background: var(--accent-color, #66c0f4);
                            border-color: var(--accent-color, #66c0f4);
                            color: white;
                            
                            .font-size-preview{
                                color: white;
                            }
                            
                            .font-size-value{
                                color: white;
                                font-weight: 600;
                            }
                            
                            .font-size-check{
                                color: white;
                            }
                        }
                        
                        .font-size-preview{
                            flex: 0 0 auto;
                            width: 40px;
                            text-align: center;
                            font-weight: 600;
                            color: var(--text-primary, #333);
                            margin-right: 15px;
                        }
                        
                        .font-size-value{
                            flex: 1;
                            font-size: 14px;
                            color: var(--text-secondary, #666);
                        }
                        
                        .font-size-check{
                            flex: 0 0 auto;
                            width: 20px;
                            text-align: center;
                            font-size: 16px;
                            font-weight: 600;
                            color: var(--accent-color, #66c0f4);
                        }
                    }
                }
            }

            .setting-theme{
                padding: 20px;
                display:flex;
                flex-direction: column;
                gap: 15px;
                flex: 1;
                    .setting-theme-item{
                    flex: 0 0 auto;
                    display:flex;
                    flex-direction:row;
                    align-items: center;
                    gap: 10px;
                    padding: 10px;
                    box-sizing:border-box;
                    cursor: pointer;
                    border: 1px solid var(--border-color, #e0e0e0);
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    &:hover {
                        background: var(--bg-tertiary, #f5f5f5);
                    }
                    .preview{
                        flex: 0 0 40px;
                        width: 40px;
                        height: 40px;
                        border: 1px solid #ccc;
                        box-sizing:border-box;
                        border-radius: 4px;
                        &.no-border{
                            border:none
                        }
                    }
                
                    .text{
                        flex: 1;
                        font-size: 16px;
                        color: var(--text-secondary, #999);
                        &.selected{
                            color: var(--text-primary, #333);
                            font-weight: 600;
                        }
                    }
                }
            }

            .setting-font-color{
                display: flex;
                flex-direction: column;
                padding: 20px;
                flex: 1;
                min-height: 0;
                overflow: hidden;
                
                .font-color-list{
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    
                    .font-color-item{
                        display: flex;
                        align-items: center;
                        padding: 12px 15px;
                        margin-bottom: 8px;
                        border: 1px solid var(--border-color, #e0e0e0);
                        border-radius: 6px;
                        background: var(--bg-tertiary, #f5f5f5);
                        cursor: pointer;
                        transition: all 0.2s ease;
                        
                        &:hover{
                            background: var(--bg-secondary, #e8e8e8);
                            border-color: var(--accent-color, #66c0f4);
                        }
                        
                        &.active{
                            background: var(--accent-color, #66c0f4);
                            border-color: var(--accent-color, #66c0f4);
                            
                            .font-color-preview,
                            .font-color-name,
                            .font-color-check{
                                color: white;
                            }
                            
                            .font-color-name{
                                font-weight: 600;
                            }
                        }
                        
                        .font-color-preview{
                            flex: 0 0 auto;
                            width: 40px;
                            text-align: center;
                            font-weight: 600;
                            font-size: 18px;
                            margin-right: 15px;
                        }
                        
                        .font-color-name{
                            flex: 1;
                            font-size: 14px;
                            color: var(--text-secondary, #666);
                        }
                        
                        .font-color-check{
                            flex: 0 0 auto;
                            width: 20px;
                            text-align: center;
                            font-size: 16px;
                            font-weight: 600;
                            color: var(--accent-color, #66c0f4);
                        }
                    }
                }
            }
        }
    }
</style>

