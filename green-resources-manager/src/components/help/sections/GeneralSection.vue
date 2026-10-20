<template>
  <HelpSection 
    :title="$lt('🛠️ 通用管理模块')" 
    :subtitle="$lt('不知道往哪里放的说明我都会放这里')"
    intro="通用管理模块是整个应用所通用的功能和特性。">
    <DetailCard :title="$lt('🎯 窗口管理')">
      <ul>
        <li><strong>{{ $lt('全屏窗口：') }}</strong>F11</li>
        <li><strong>{{ $lt('最小化窗口：') }}</strong>Ctrl+M</li>
        <li><strong>{{ $lt('关闭窗口：') }}</strong>Ctrl+W</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🎯 视图管理')">
      <ul>
        <li><strong>{{ $lt('重新加载：') }}</strong>Ctrl+R</li>
        <li><strong>{{ $lt('强制重新加载：') }}</strong>Ctrl+Shift+R</li>
        <li><strong>{{ $lt('开发者工具：') }}</strong>Ctrl+Shift+I</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🎯 伪装模式')"> {{ $lt('伪装模式是一个非常使用的功能，打开这个模式后，所有资源的封面图') }} </DetailCard>

    <DetailCard :title="$lt('🎯 数据的存储')">
      <ul>
        <li><strong>{{ $lt('数据的存储位置：') }}</strong>{{ $lt('默认在应用目录的 SaveData 文件夹中') }}</li>
        <li><strong>{{ $lt('会存储哪些内容：') }}</strong>{{ $lt('存档会自动保存添加的所有资源路径和信息。同时会自动复制封面图到文件夹中。游戏的截图也会保存到存档中') }}</li>
        <li><strong>{{ $lt('如何更改存档位置：') }}</strong>{{ $lt('如需更改存档位置，可以在设置中的"存档文件夹位置"中改为自定义目录，并设置自定义的文件夹路径。设置完毕后，如果文件夹里面没有SaveData，管理器会自动在这个目录下创建SaveData文件夹，并将现有存档的内容复制到这里。如果这个目录已经有SaveData 文件夹，会读取这个文件夹。') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🎯 tag索引系统')">
      <b>{{ $lt('这个功能是管理器最重要的核心功能。') }}</b><br>
      <ul>
        <li><strong>{{ $lt('tag索引系统：') }}</strong>{{ $lt('管理器会自动收集所有资源的tag，并显示到不同资源的左侧导航栏') }}</li>
        <li><strong>{{ $lt('如何注册一个tag：') }}</strong>{{ $lt('在添加资源时，可以为资源添加tag。tag可以是任意的字符串，比如"萝莉"、"萝莉"、"萝莉"和"萝莉"等。') }}</li>
        <li><strong>{{ $lt('如何使用tag索引系统：') }}</strong>{{ $lt('左键tag代表选择包含这个tag的资源。右键tag代表剔除这个tag的资源。') }}</li>
        <li><strong>{{ $lt('tag的多选') }}</strong>{{ $lt('当点击多个tag时，默认使用"AND"运算。例如选择了白丝和萝莉两个tag，则代表选择同时包含白丝和萝莉的资源。') }}</li>
      </ul>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>

