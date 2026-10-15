# 📚 图书馆喂猫 · Library Cats

一个像素风治愈小游戏：在一间夜晚的图书馆里闲逛，找到 10 只猫，投喂它们。

## 玩法

- **WASD / 方向键** 移动
- 走近猫咪，按 **E** 投喂
- 每只猫有 5 颗心的好感度；喂满后它会开心地跟着你走一段
- 没有目标，没有结局。猫开心，你开心。

## 运行

直接双击 `index.html` 即可（无需安装任何东西）。

或者起个本地服务：

```bash
python3 -m http.server 8137
# 打开 http://localhost:8137
```

## 技术说明

纯 HTML + Canvas + 原生 JavaScript，零依赖零构建。
`npm test` 跑单元测试（地图碰撞 / 精灵尺寸 / 猫状态机）。

## 截图

见 `docs/screenshots/`。
