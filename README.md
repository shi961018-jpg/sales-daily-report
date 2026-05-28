# 奶茶店销售日报生成器

这是一个给奶茶店老板和店员使用的手机网页工具，用来每天统计销量、营业额、原料成本、毛利和毛利率，并一键复制日报发到微信群。

## 可运行工具

正式地址：

https://shi961018-jpg.github.io/sales-daily-report/

演示地址：

https://shi961018-jpg.github.io/sales-daily-report/?demo=1

## 交付文件

| 文件 | 说明 |
| --- | --- |
| `index.html` | 工具主页面 |
| `styles.css` | 页面样式 |
| `app.js` | 自动计算和复制日报功能 |
| `操作说明.md` | 给客户看的使用说明 |
| `报价单.md` | 简单报价单 |
| `intro-video.html` | 30 秒介绍视频录制页 |
| `deliverables/showcase-screenshot.png` | 展示截图 |
| `deliverables/intro-video.m4v` | 30 秒介绍视频 |

## 功能

- 输入饮品名称、销量、售价和成本价。
- 自动计算每项营业额和毛利。
- 自动汇总总营业额、总销量、总成本、总毛利和毛利率。
- 自动生成微信群日报文案。
- 点击按钮复制日报内容。
- 手机端自适应。

## 本地运行

双击 `index.html` 可以直接打开。

也可以在项目目录运行：

```bash
python3 -m http.server 4174
```

然后打开：

http://127.0.0.1:4174/
