# FRAME / 帧外影业

无构建依赖的响应式影视作品集概念网站。入口：`dist/index.html`。

## 功能
全屏 WebGL 三维作品展厅（弧形纵深路径、滚轮/上下拖动驱动摄影机、物理惯性与阻尼、磁吸定位、粒子视差、自定义着色器形变和色散、同一媒体网格推近至全屏详情）、作品分类与索引、模特档案与参演广告关联、企业合作伙伴字标墙、电影入场动画、服务面板、需求简报下载。

## 沉浸式展厅
`dist/space.js` 使用本地 Three.js 模块与 WebGL ShaderMaterial 渲染真实三维网格。`space-motion.js` 实现独立于帧率的惯性与阻尼弹簧导航；`space.css` 仅绘制导航及可访问的说明文字，作品本身是 GPU 网格。

打开首页或 `#work` 会进入全屏展厅；滚轮/触屏上下滑动推进，方向键或索引切换，点击屏幕或回车进入详情。Escape 返回展厅，再次 Escape 返回网站。顶部入口可访问模特或合作咨询。减少动态效果设置会停用速度形变与粒子运动。

当前使用图片纹理。为作品添加 `video` 字段（自有、允许跨域加载的 MP4 URL）即可启用 `THREE.VideoTexture`，进入展厅时静音播放，退出或切至后台时暂停。没有真实成片时不以无关视频冒充作品。

依赖许可证：`dist/vendor/THREE-LICENSE.txt`。WebGL 不可用时提供传统作品列表。

验证惯性、吸附、帧率一致性和边界：`node tests/space-motion.test.mjs`。

## 本地预览
在项目目录执行 `python -m http.server 4173 --directory dist`，访问 http://localhost:4173 。

## 内容替换
在 `dist/app.js` 的 `works` 数组中维护作品，在 `images` 中更换图片。使用自有成片替换 `dist/index.html` 中的视频地址。当前品牌、作品、客户信息均为概念示例；表单只生成本地文本文件，不发送邮件、不持久化数据。上线商业使用前请替换真实企业信息、接入询盘服务并确认素材权利。

## 素材来源
- 沙漠：NEOM / https://unsplash.com/photos/a-lone-person-standing-in-the-middle-of-a-desert-bhKqZNZeAR0
- 城市：David Cain / https://unsplash.com/photos/man-riding-motorcycle-on-street-between-buildings-QVfqbaLow4M
- 海洋：Thomas Ashlock / https://unsplash.com/photos/person-surfing-on-wave-7G5dkthFyxA
- 人像：Christin Hume / https://unsplash.com/photos/woman-wearing-chambray-button-up-top-looking-through-the-window-hNqvqmeQuIc
- 视频：MDN CC0 flower https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4

图片与字体通过远程地址加载，需要网络连接。

## 模特与合作品牌
模特资料与参演关系维护于 `dist/experience.js` 的 `talents` 数组；`films[].id` 对应 `app.js` 的作品数组下标。品牌字标在 `dist/index.html` 的 `partners` 区域维护。现有姓名、身高、语言、城市、参演关系和品牌均为虚构示范，不代表照片人物真实信息或实际合作。

模特肖像素材来源：
- Valerie Elash：https://unsplash.com/photos/selective-focus-photography-of-woman-in-black-turtle-neck-long-sleeved-shirt-9IL_stSpvOU
- Taylor Grote：https://unsplash.com/photos/man-holding-black-suit-jacket-rnH5ITofDAM
- Daniel Stiel：https://unsplash.com/photos/a-woman-in-a-suit-and-tie-with-red-lipstick-DA-1ph3OE7A
