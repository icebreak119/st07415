# ST07415

专属点餐 PWA 应用。

## 使用方法

### 电脑预览
用浏览器直接打开 `index.html` 即可。

### iPhone 添加到主屏幕（推荐）
1. 在电脑上启动一个本地服务器（推荐用 VS Code 的 Live Server 插件）
2. 确保手机和电脑在同一 WiFi 下
3. iPhone 用 Safari 打开电脑的局域网地址
4. 点击 Safari 底部的 **分享按钮** (方框+箭头)
5. 选择 **"添加到主屏幕"**
6. 点击 **"添加"**

添加后就像原生 App 一样使用，支持离线运行。

### 快速本地服务器
```bash
# 如果安装了 Node.js
npx serve .

# 如果安装了 Python
python -m http.server 8000
```

## 功能

- **首页** — 9 大分类浏览 + 随机推荐
- **分类页** — 查看某分类下所有菜品，一键加入点餐车
- **点餐车** — 调整数量，确认下单
- **历史记录** — 查看过往订单
- **菜品管理** — 添加/删除菜品

## 数据存储

所有数据存储在手机浏览器本地（IndexedDB），不会上传到任何服务器。

## 技术

- 纯 HTML + CSS + JavaScript
- PWA（Service Worker 离线缓存）
- IndexedDB 本地数据库
- 零依赖，无需构建

## 打包成 iPhone App

仓库现在已经补好了 `Capacitor` 打包配置，可以把这套网页同步进 iOS 原生壳工程。

### 当前机器能做的

```bash
npm install
npm run cap:add:ios
```

执行后会生成 `dist/` 和 `ios/`，其中：

- `dist/` 是给原生壳使用的前端静态资源
- `ios/` 是 Xcode 工程骨架

### 真正导出 `.ipa` 还需要什么

苹果安装包最终必须在 **macOS + Xcode** 上完成签名和导出，Windows 这边不能直接产出可安装的正式 `ipa`。

在 Mac 上继续执行：

```bash
npm install
npm run ios:sync
npm run ios:open
```

然后在 Xcode 里：

1. 选中 `App`
2. 配置 `Signing & Capabilities`
3. 连接 iPhone 直接运行，或走 `Product > Archive` 导出安装包

如果你只是想在 iPhone 上自己用，其实当前这个 PWA 版本也可以直接通过 Safari 的“添加到主屏幕”安装。
