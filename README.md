# haidi.fun

个人技术博客与作品集合：13 个项目，13 篇文章，按「基础 → 进阶 → 综合 → 研究」组织。

## 技术栈

- 前端：HTML + CSS + 原生 JavaScript，无框架、无 jQuery
- 内容：JSON 驱动，项目与文章由本地 Python 后端生成
- 部署：IIS（`web.config`）或 Nginx，纯静态
- 音乐：左下角黑胶播放器，三首本地 mp3，点碟片播放/暂停

## 页面

| 路由 | 内容 |
| --- | --- |
| `#/works` | 13 个项目，可按学习阶段筛选 |
| `#/works/<id>` | 项目详情：指标、实现、结果截图（弹窗放大） |
| `#/blog` | 技术文章：标签、层级、搜索 |
| `#/blog/<id>` | 文章详情 |

## 本地预览

```bash
python -m http.server 8100
# 打开 http://127.0.0.1:8100/
```

> 
> 直接双击 `index.html` 时，浏览器会拦截 `fetch('data/content.json')`，请使用本地服务。

## 部署

### IIS

把仓库内容放到站点根目录，`web.config` 已包含：

- `.webp / .json / .woff2` 的 MIME
- 404 页面、缓存策略、安全头
- 屏蔽 `.git` 等目录

### Nginx

```
root /var/www/haidi;
index index.html;
location / { try_files $uri $uri/ =404; }
location ~* \.(css|js)$ { expires 7d; }
location ~* \.(webp|png|jpg|ico|svg)$ { expires 30d; }
location = /data/content.json { add_header Cache-Control "no-cache"; }
```

## 说明

- 项目结果截图来自本地真实运行，指标写在项目页；
- 文章按难度分为基础、进阶、综合、研究四档；
- 内容后端（Python 标准库实现）不在本仓库，站点只依赖静态文件。
