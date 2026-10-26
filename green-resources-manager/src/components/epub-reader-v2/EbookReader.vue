<template>
  <div class="ebook">
      <div class="read-container">
          <div class="read-wrapper">
              <div id="read"></div>
          </div>
          <!-- 底部导航 -->
          <div class="reader-footer">
            <div class="reader-navigation">
              <button class="btn-prev" @click="prevPage" :disabled="!canGoPrevious">
                <span class="btn-icon">←</span> {{ $lt('上一页') }} </button>
              <div class="progress-section">
                <span class="page-info">{{ progress }}%</span>
                <div class="progress-wrapper">
                  <input 
                    class="progress" 
                    type="range" 
                    max="100" 
                    min="0"
                    step="1" 
                    @change="onProgressChange($event.target.value)"
                    @input="onProgressInput($event.target.value)" 
                    :value="progress"
                    :disabled="!bookAvailable" 
                    ref="progress">
                </div>
              </div>
              <button class="btn-next" @click="nextPage" :disabled="!canGoNext"> {{ $lt('下一页') }} <span class="btn-icon">→</span>
              </button>
            </div>
          </div>
      </div>
        <menu-bar :ifTitleAndMenuShow="true" 
                @getCurrentLocation="getCurrentLocation"
                :fontSizeList = "fontSizeList" 
                :defaultFontSize="defaultFontSize"
                @setFontSize="setFontSize" 
                :themeList="themeList" 
                :defaultTheme="defaultTheme"
                @setTheme = "setTheme" 
                :fontColorList="fontColorList"
                :defaultFontColor="defaultFontColor"
                @setFontColor="setFontColor"
                :bookAvailable = "bookAvailable" 
                @jumpTo="jumpTo"
                ref="menuBar">
        </menu-bar>
  </div>
</template>
<script>
import MenuBar from './MenuBar.vue'
import ePub from 'epubjs'

export default {
    components:{
        MenuBar
    },
    props: {
        filePath: {
            type: String,
            required: true
        },
        /** EPUB 内部位置。有的话打开时直接跳到这里，而不是从开头排。 */
        initialCfi: {
            type: String,
            default: ''
        }
    },
    data(){
        return{
            fontSizeList:[
                {
                    fontSize:12
                },
                {
                    fontSize:14
                },
                {
                    fontSize:16
                },
                {
                    fontSize:18
                },
                {
                    fontSize:20
                },
                {
                    fontSize:22
                },
                {
                    fontSize:24
                }
            ],
            defaultFontSize:16,
            themeList:[{
                name:'默认',
                style:{
                    body:{
                        'color':'#000',
                        'background':'#fff'
                    }
                }
            },{
                name:'护眼绿',
                style:{
                    body:{
                        'color':'#000',
                        'background':'#ceeaba'
                    }
                }
            },{
                name:'夜间模式',
                style:{
                    body:{
                        'color':'#fff',
                        'background':'#000'
                    }
                }
            },{
                name:'米黄色',
                style:{
                    body:{
                        'color':'#000',
                        'background': 'rgb(238, 232, 170)'
                    }
                }
            },{
                name:'浅蓝色',
                style:{
                    body:{
                        'color':'#000',
                        'background':'#e6f3ff'
                    }
                }
            },{
                name:'浅灰色',
                style:{
                    body:{
                        'color':'#000',
                        'background':'#f5f5f5'
                    }
                }
            },{
                name:'深灰色',
                style:{
                    body:{
                        'color':'#fff',
                        'background':'#2d2d2d'
                    }
                }
            },{
                name:'羊皮纸',
                style:{
                    body:{
                        'color':'#000',
                        'background':'#f4e4bc'
                    }
                }
            },{
                name:'淡紫色',
                style:{
                    body:{
                        'color':'#000',
                        'background':'#f0e6ff'
                    }
                }
            },{
                name:'淡粉色',
                style:{
                    body:{
                        'color':'#000',
                        'background':'#ffe6f0'
                    }
                }
            }],
            defaultTheme: 0,
            fontColorList:[
                {
                    name: '黑色',
                    color: '#000000'
                },
                {
                    name: '深灰',
                    color: '#333333'
                },
                {
                    name: '灰色',
                    color: '#666666'
                },
                {
                    name: '浅灰',
                    color: '#999999'
                },
                {
                    name: '深蓝',
                    color: '#1e3a8a'
                },
                {
                    name: '蓝色',
                    color: '#3b82f6'
                },
                {
                    name: '深绿',
                    color: '#166534'
                },
                {
                    name: '绿色',
                    color: '#22c55e'
                },
                {
                    name: '深红',
                    color: '#991b1b'
                },
                {
                    name: '红色',
                    color: '#ef4444'
                },
                {
                    name: '深棕',
                    color: '#78350f'
                },
                {
                    name: '棕色',
                    color: '#d97706'
                }
            ],
            defaultFontColor: '#000000',
            bookAvailable :false,
            navigation: null,
            progress:0,
            book: null,
            rendition: null,
            themes: null,
            locations: null
        }
    },
    computed: {
        canGoPrevious() {
            // 检查是否可以上一页（进度大于0）
            return this.progress > 0
        },
        canGoNext() {
            // 检查是否可以下一页（进度小于100）
            return this.progress < 100 && this.bookAvailable
        }
    },
    methods:{
        handleClose() {
            this.$emit('close')
        },
        getCurrentLocation(){
            if(this.rendition){
                this.showProgress()
            }
        },
        // 进度条跳转更新
        showProgress(){
            if (!this.bookAvailable || !this.locations || !this.rendition) return
            // 获取当前位置信息
            const currentLoction = this.rendition.currentLocation()
            const cfi = currentLoction?.start?.cfi || ''
            // 获取当前位置进度百分比
            this.progress = cfi ? this.locations.percentageFromCfi(cfi) : 0
            // 转化成0-100的数字
            this.progress = Math.round(this.progress*100)
            if (cfi) this.$emit('location-changed', cfi)
            this.$emit('progress-changed', this.progress)
            // 更新进度条样式
            this.$nextTick(() => {
                if(this.$refs.progress){
                    this.$refs.progress.style.backgroundSize = `${this.progress}% 100%`
                }
            })
        },
        // 根据链接跳转到指定位置
        jumpTo(href){
            if(this.rendition){
                this.rendition.display(href).then(()=>{
                    this.showProgress()
                })
            }
            // 隐藏菜单栏弹出的设置栏
            if(this.$refs.menuBar){
                this.$refs.menuBar.hideSetting()
                // 隐藏目录（如果还在菜单中）
                if(this.$refs.menuBar.hideContent){
                    this.$refs.menuBar.hideContent()
                }
            }
        },
        onProgressChange(progress){
            const percentage = progress / 100
            const location = percentage > 0 ? this.locations.cfiFromPercentage(percentage) : 0
            this.rendition.display(location)
        },
        setTheme(index){
             this.themes.select(this.themeList[index].name);
             this.defaultTheme = index;
        },
        registerTheme(){
            this.themeList.forEach(theme=>{
                this.themes.register(theme.name,theme.style)
            })
        },
        setFontSize(fontSize){
            this.defaultFontSize = fontSize
            if(this.themes){
                this.themes.fontSize(fontSize + 'px')
            }
        },
        setFontColor(color){
            this.defaultFontColor = color
            if(this.themes){
                this.themes.override({
                    body: {
                        color: color + ' !important'
                    }
                })
            }
        },
        prevPage(){
            // Rendition.prev
            if(this.rendition){
                this.rendition.prev().then(()=>{
                   this.showProgress()
                })
            }
        },
        nextPage(){
            // Rendition.next
            if(this.rendition){
                this.rendition.next().then(()=>{
                   this.showProgress()
                })
            }
        },
        // 电子书的解析和渲染
        async showEpub(){
            try {
                // 使用传入的文件路径
                let epubUrl = this.filePath
                
                // 在 Electron 环境中，epubjs 可以直接使用文件路径
                // 如果路径已经是 URL 格式（file://, http://, https://），直接使用
                // 否则，尝试转换为 file:// URL
                if (epubUrl && !epubUrl.startsWith('http://') && !epubUrl.startsWith('https://') && !epubUrl.startsWith('file://')) {
                    // 转换为 file:// URL (Windows 路径处理)
                    epubUrl = epubUrl.replace(/\\/g, '/')
                    if (epubUrl.startsWith('/')) {
                        epubUrl = 'file://' + epubUrl
                    } else {
                        epubUrl = 'file:///' + epubUrl
                    }
                }
                
                console.log('加载 EPUB 文件:', epubUrl)
                
                // 等待 DOM 渲染完成
                await this.$nextTick()
                
                // 生成book,Rendition,
                this.book = new ePub(epubUrl)
                // 获取容器元素，使用容器的实际尺寸而不是窗口尺寸
                const container = document.getElementById('read')
                const containerWidth = container && container.clientWidth > 0 ? container.clientWidth : (container ? container.offsetWidth : window.innerWidth)
                const containerHeight = container && container.clientHeight > 0 ? container.clientHeight : (container ? container.offsetHeight : window.innerHeight)
                this.rendition = this.book.renderTo('read',{
                    width: containerWidth,
                    height: containerHeight
                })
                // 翻页后再报位置。目录生成前的第一次排版先不报，避免把开头当成新进度盖掉上次的位置。
                this.rendition.on('relocated', () => {
                    if (!this.bookAvailable) return
                    this.showProgress()
                })
                // 获取Theme对象
                this.themes = this.rendition.themes
                // 设置默认字体
                this.setFontSize(this.defaultFontSize)
                // this.themes.register(name,styles)
                this.registerTheme()
                // this.themes.select(name)
                this.setTheme(this.defaultTheme)
                // 设置默认字体颜色
                this.setFontColor(this.defaultFontColor)
                // 先生成目录和位置表，再打开上次的位置。百分比要等位置表出来才能算。
                this.book.ready.then(()=>{
                    this.navigation = this.book.navigation
                    // 向父组件发送navigation数据
                    this.$emit('navigation-updated', this.navigation)
                   
                    return this.book.locations.generate()
                }).then(async ()=>{
                    this.locations = this.book.locations
                    try {
                        if (this.initialCfi) {
                            await this.rendition.display(this.initialCfi)
                        } else {
                            await this.rendition.display()
                        }
                    } catch (error) {
                        console.warn('恢复 EPUB 位置失败，从开头打开:', error)
                        await this.rendition.display()
                    }
                    this.bookAvailable = true
                    // 再次发送navigation数据，确保父组件收到
                    this.$emit('navigation-updated', this.navigation)
                    // 发送rendition就绪事件
                    this.$emit('rendition-ready', this.rendition)
                    // 位置已经落到上次读到的地方，这时再允许外层记进度。
                    this.$emit('ready')
                    this.showProgress()
                }).catch(error => {
                    console.error('加载 EPUB 失败:', error)
                })
            } catch (error) {
                console.error('初始化 EPUB 阅读器失败:', error)
            }
        }
    },
    mounted(){
        this.showEpub()
    },
    beforeUnmount() {
        // 清理资源
        if (this.rendition) {
            this.rendition.destroy()
        }
        if (this.book) {
            this.book.destroy()
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

/* CSS Reset - 仅重置 EPUB 阅读器内部元素 */
#read,
#read * {
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 100%;
    font: inherit;
    vertical-align: baseline;
    box-sizing: border-box;
}

#read article,
#read aside,
#read details,
#read figcaption,
#read figure,
#read footer,
#read header,
#read hgroup,
#read menu,
#read nav,
#read section {
    display: block;
}

#read body {
    line-height: 1.6;
}

#read ol,
#read ul {
    list-style: none;
}

#read blockquote,
#read q {
    quotes: none;
}

#read blockquote:before,
#read blockquote:after,
#read q:before,
#read q:after {
    content: '';
    content: none;
}

#read table {
    border-collapse: collapse;
    border-spacing: 0;
}

#read {
    width: 100%;
    height: 100%;
    font-family: 'PingFangSC-Light', 'PingFang SC', 'STHeitiSC-Light', 'Helvetica-Light', 'Arial', 'sans-serif';
}
.ebook{
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    
    .read-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    
    .read-wrapper{
        width: 100%;
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
        
        #read {
            width: 100%;
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
            flex: 1;
        }
    }
    
    // 底部导航
    .reader-footer {
        padding: 15px 20px;
        border-top: 1px solid var(--border-color, #e0e0e0);
        background: var(--bg-tertiary, #f5f5f5);
        flex-shrink: 0;
    }
    
    .reader-navigation {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
    }
    
    .btn-prev,
    .btn-next {
        background: var(--accent-color, #66c0f4);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: background 0.3s ease;
        font-size: 14px;
        flex-shrink: 0;
        
        &:hover:not(:disabled) {
            background: var(--accent-hover, #4fa8d8);
        }
        
        &:disabled {
            background: var(--bg-secondary, #e0e0e0);
            color: var(--text-tertiary, #999);
            cursor: not-allowed;
            opacity: 0.6;
        }
    }
    
    .progress-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        min-width: 0;
        
        .page-info {
            color: var(--text-secondary, #666);
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
        }
        
        .progress-wrapper {
            width: 100%;
            padding: 0 10px;
            
            .progress {
                width: 100%;
                -webkit-appearance: none;
                appearance: none;
                height: 4px;
                background: -webkit-linear-gradient(#999, #999) no-repeat, #ddd;
                background-size: 0 100%;
                border-radius: 2px;
                cursor: pointer;
                outline: none;
                
                &:focus {
                    outline: none;
                }
                
                &::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: var(--accent-color, #66c0f4);
                    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, .2);
                    border: 2px solid white;
                    cursor: pointer;
                }
                
                &::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: var(--accent-color, #66c0f4);
                    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, .2);
                    border: 2px solid white;
                    cursor: pointer;
                }
                
                &:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            }
        }
    }
}
</style>

