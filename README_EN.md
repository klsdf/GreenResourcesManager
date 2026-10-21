# Green Resources Manager

**A comprehensive, free local multimedia resource manager. Easily manage your games, comics, novels, music, websites and other resources**

[![Version](https://img.shields.io/badge/version-0.6.0-blue.svg)](https://github.com/klsdf/GreenResourcesManager) [![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-orange.svg)](LICENSE) [![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)](https://github.com/klsdf/GreenResourcesManager) [![Vue](https://img.shields.io/badge/Vue-3.3.8-4FC08D.svg)](https://vuejs.org/) [![Electron](https://img.shields.io/badge/Electron-27.1.0-47848F.svg)](https://www.electronjs.org/)

[![Bilibili](https://img.shields.io/badge/bilibili-哔哩哔哩-00A1D6?logo=bilibili)](https://space.bilibili.com/36163336?spm_id_from=333.1007.0.0) [![QQ群](https://img.shields.io/badge/QQ群-群号-blue?logo=tencent-qq)](https://qm.qq.com/q/16bCL6VeTo) [![帽子社官网](https://img.shields.io/badge/帽子社-官网-orange)](https://hat-soft.top/)

[English](#) | [中文](README.md)

QQ groups: 853149421 / 1098139167

🌐 [**Official website**](https://klsdf.github.io/GreenResourcesManager/) | 📖 [**Help center**](https://klsdf.github.io/GreenResourcesManager/docs/)

## 📑 Table of Contents

* [📖 Product Introduction](#-product-introduction)
  * [Development Background](#development-background)
  * [Target Users](#target-users)
  * [Features](#features)
  * [Tech Stack](#tech-stack)
  * [Screenshots](#screenshots)
* [💾 Download for Users](#-download-for-users)
* [🛠️ Developer Environment Setup](#️-developer-environment-setup)
  * [Prerequisites](#prerequisites)
  * [Building Green Resources Manager](#building-green-resources-manager)
  * [Building Promotional Video](#building-promotional-video)
* [🚀 Future Plans](#-future-plans)
* [🤝 Join Us](#-join-us)

## 📖 Product Introduction

### Development Background

Green Resources Manager is a comprehensive multimedia resource manager designed for "digital hoarders". As storage costs decrease, it has become possible for individuals to own large-capacity storage, but the difficulty of managing massive resources has also increased. When resources exceed 10TB, neither categorization by type nor by frequency of use can meet the needs.

**Green Resources Manager was created** to provide a unified interface for managing various multimedia resources such as games, comics, videos, audio, novels, and websites, making resource management elegant and efficient.

### Target Users

- Users with strong digital hoarding tendencies
- Users who want to manage software and media in a more elegant way

### Features

- **🎯 All-in-One Multimedia Management**: Unified interface for managing games, comics, videos, audio, novels, websites and other resources
- **🔍 Powerful Filtering System**: Multi-dimensional filtering by tags, authors, series, and real-time search
- **📱 Built-in Players/Readers**: Built-in game launcher, comic reader, video player, audio player, and novel reader
- **💾 Powerful Data Recording**: Records game playtime, comic reading counts, video watch progress and more, with in-game screenshot capability like Steam
- **🎮 Gamification Experience**: Achievement system and other gamification features to make resource management more fun

### Tech Stack

**Product**

- **Frontend Framework**: Vue 3
- **Build Tool**: Vite
- **Desktop Framework**: Electron
- **Language**: TypeScript

**Promotional Video**

- **Video Production Framework**: Motion Canvas
- **Build Tool**: Vite
- **Language**: TypeScript
- **Video Rendering**: FFmpeg

### Screenshots

![Game Screenshot](image/游戏截图.png)

![Screenshot 1](image/截图2.png)

![Screenshot 2](image/截图3.png)

![Screenshot 3](image/截图4.png)

## 💾 Download for Users

1. [Download directly from GitHub](https://github.com/klsdf/GreenResourcesManager/releases/latest)

## 🛠️ Developer Environment Setup

### Prerequisites

- Node.js (LTS version recommended)
- npm

### Building Green Resources Manager

#### 1. Navigate to directory

```shell
cd green-resources-manager
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Debug application

Start Vite development server and Electron application

```shell
npm run electron-dev
```

#### 4. Build application

```bash
npm run electron-build
```

### Building Promotional Video

Yes, the promotional video is also written in code!

#### 1. Navigate to directory

```shell
cd green-resources-video
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Open video preview webpage

1. First run the command

   ```
   npm run start
   ```

2. Then open http://localhost:9000/

#### 4. Render video

Click RENDER directly in the webpage

## 🚀 Future Plans

- [ ] **Resource Processing**
  - [ ] Auto-extract rar and zip files
  - [ ] Auto-rename file extensions to rar
  - [ ] Custom extraction passwords
  - [ ] Built-in common extraction passwords
  - [ ] One-click installation of common runtime environments
- [ ] **Gamification Features**
  - [ ] Game storyline and main quest
  - [ ] Timeline and daily tasks
- [ ] **Social Features**
  - [ ] Login and registration system
  - [ ] Community features
  - [ ] Comment system
  - [ ] Data synchronization
- [ ] **Resource Scraping**
  - [ ] Auto-detect local resources and add to manager
  - [ ] Auto-collect resources from Steam, Dlsite, Itch and other websites, obtaining tags, descriptions and other data
- [ ] **Auxiliary Features**
  - [ ] Game guides
  - [ ] Game trainers
  - [ ] Game modification tutorials
- [ ] Flash game support

## 🤝 Join Us

![Hat Soft](image/hat-soft.png)

Hat Soft is a community focused on experimental game development and game theory research, while also exploring game-related tools and product development. Welcome to join us.

[Click to join our QQ group【Hat Soft - Notification Center】](https://qm.qq.com/q/sUCdrpPNkc)

---

<div align="center">Made by YanChenXiang ❤️</div>

[⬆ Back to Top](#-table-of-contents)

