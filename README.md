# Avery Sun — 个人网站

纯 HTML + CSS + JavaScript，没有任何框架，可以直接放到 GitHub Pages。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `index.html` | 网站本体：大标题、导航、底部，以及三个页面（about / work / play）的内容，都在这里 |
| `css/style.css` | 所有样式：颜色、字体、大小、动画、手机适配 |
| `js/main.js` | 让页面“动起来”：切换 about/work/play、改网址、导航高亮块滑动、贴纸动画、加载手绘图片 |
| `js/play.js` | play 页三张卡片的互动（一般不用改） |
| `data/music.js` `data/movies.js` `data/friends.js` | play 页的内容：歌、电影、朋友（加内容改这里） |
| `images/play/` | play 页图片：music/ 封面、movies/ 海报、friends/ 朋友 |
| `js/about.js` | about 页：工作证后面的拍立得（悬停滑出、点击抽出、拖动、tidy up） |
| `about/` `work/` `play/` | 每个里面一个小跳转文件，让直接打开 /about 等网址时正常显示（不会返回 404） |
| `404.html` | 打开不存在的网址时显示的页面 |
| `images/` | 手绘批注图片：circle.png、wavy.png、arrow.png、note.png（有就用，没有就显示代码画的版本） |
| `images/about/` | 证件照 main.jpg、6 张拍立得照片，以及可选的手写图片（文件名全部小写） |

## 常见修改

- **改页面文字**：打开 `index.html`，找到最下面的 `<template id="page-about">`（或 work / play）
- **换证件照**：替换 `images/about/main.jpg`，刷新即可
- **换拍立得**：替换 `images/about/` 里同名的照片；手写标签放 `images/handwriting/label-xxx.png`，签名是 `images/handwriting/signature.png`；头像、便签分别是 `images/about/avatar.png`、`images/about/note.png`
- **手写素材**：标题和底部的手写圈、波浪线、箭头、小字都在 `images/handwriting/`，同名替换即可
- **换手绘批注**：把 circle.png / wavy.png / arrow.png / note.png 放进 `images/`，刷新即可（建议透明背景 PNG）
- **换颜色**：打开 `css/style.css`，最上面 `:root { ... }` 里的颜色

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库（名字叫 `你的用户名.github.io` 最省事）
2. 把这个文件夹里的所有文件上传进去
3. 仓库 Settings → Pages → Source 选 `main` 分支、`/ (root)`，保存
4. 等一两分钟，打开 `https://你的用户名.github.io` 就能看到

## play 页加内容

- **加一首歌**：把封面放进 `images/play/music/`，打开 `data/music.js`，复制一段 `{ ... },` 粘贴进去，改封面路径、歌名、歌手、Spotify 链接
- **加一部电影**：把海报放进 `images/play/movies/`，打开 `data/movies.js`，复制一段改海报路径、片名、导演、年份、短评
- **加一张朋友照片**：把图片放进 `images/play/friends/`，打开 `data/friends.js`，复制一段改图片路径；透明背景的剪影写 `type: "cutout"`，合照写 `type: "photo"`

## 上线（GitHub Pages）
- 线上网址：https://avery3un.github.io
- 仓库：https://github.com/avery3un/avery3un.github.io
- 改完网站后，跟 Claude 说一句「帮我更新上线」即可（会提交改动并推送到 GitHub，1–2 分钟后线上自动更新）。
- `_originals/` 里是压缩前的原图备份，不会上传。
