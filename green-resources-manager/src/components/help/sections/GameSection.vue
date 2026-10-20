<template>
  <HelpSection 
    :title="$lt('🎮 游戏管理模块')" 
    :subtitle="$lt('实际上也可以管应用。我的unity和PS等软件就是用这个管的。还挺好用的')"
    intro="游戏管理模块是绿色资源管理器的核心功能之一。它实现了一套类似steam的软件管理系统。帮助您管理各种类型的游戏文件，并帮您获得游戏的附加信息。游玩时模块会自动记录您游戏的时长、运行次数、最后游玩时间等统计信息。并提供了一个功能强大的截图工具，让您在游戏中可以快速截图。">
    <DetailCard :title="$lt('🎯 添加游戏')">
      <ul>
        <li><strong>{{ $lt('用按钮添加游戏：') }}</strong>{{ $lt('在游戏页的上方有一个添加游戏的按钮，点击后会弹出添加游戏的对话框，您可以在这里添加游戏。添加游戏时，必须指定一个游戏exe文件。') }}</li>
        <li><strong>{{ $lt('拖动添加游戏：') }}</strong>{{ $lt('您可以拖动一个游戏exe文件到游戏页的上方，游戏会自动添加到游戏库中。') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🎯 删除游戏')"> {{ $lt('删除游戏仅仅是值移除本管理器对游戏的引用，不会删除本地的游戏文件。') }} <ul>
        <li><strong>{{ $lt('右键菜单删除游戏：') }}</strong>{{ $lt('对游戏卡进行右键，可以看到删除的选项。') }}</li>
        <li><strong>{{ $lt('详情页删除游戏：') }}</strong>{{ $lt('在游戏的详情页内，可以看到删除游戏的选项。') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🎯 修改游戏信息')">
      <ul>
        <li><strong>{{ $lt('右键菜单修改游戏信息：') }}</strong>{{ $lt('对游戏卡进行右键，可以看到修改信息的选项。') }}</li>
        <li><strong>{{ $lt('详情页修改游戏信息：') }}</strong>{{ $lt('在游戏的详情页内，可以看到修改游戏信息的选项。') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🎯 游戏文件丢失检测')"> {{ $lt('进入游戏页面时，会自动检测所有的游戏文件是否存在。如果不存在，则会在游戏卡的左上角显示一个警告标志。 游戏文件丢失不会导致数据丢失。所有的数据记录仍然会保存') }} </DetailCard>

    <DetailCard :title="$lt('🎯 应用内启动游戏')">
      <ul>
        <li>{{ $lt('点击游戏卡的中央部位可以快速启动游戏') }}</li>
        <li>{{ $lt('右键菜单可以快速启动游戏') }}</li>
        <li>{{ $lt('详情页可以快速启动游戏') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🎯 游戏时长记录 🔥🔥')"> {{ $lt('通过APP内启动游戏时，会自动记录游戏时长。并且会每秒同步游戏的总时长。') }} </DetailCard>

    <DetailCard :title="$lt('🎯 其他游戏信息记录')"> {{ $lt('除了最为重要的游戏时长外，游戏还会记录以下数据：') }}<br> {{ $lt('- 第一次注册该游戏的时间') }}<br> {{ $lt('- 上一次运行该游戏的时间') }} </DetailCard>

    <DetailCard :title="$lt('🎯 游戏截图功能 🔥🔥')">
      <ul>
        <li>{{ $lt('进入游戏后，按下ctrl+f12可以快速截图。截图键可以自定义') }}</li>
        <li>{{ $lt('右键游戏卡， 可以从菜单中打开截图文件夹') }}</li>
      </ul>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>

