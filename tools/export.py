#!/usr/bin/env python3
# export.py —— 用 Playwright 打开 tools/export.html，把地块素材 canvas 按内容去重存为 PNG 并写 manifest.json
# 用法：/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
import base64
import functools
import hashlib
import http.server
import json
import shutil
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / 'src' / 'assent' / 'img'
PORT = 8123


def serve_forever():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', PORT), handler) as httpd:
        httpd.serve_forever()


def collect():
    """打开导出页，返回 (items, scene_diff, diff)。
    items: [{key, w, h, dataUrl}]；scene_diff: 内存素材自检；diff: PNG 回读二次校验（首跑为 None）"""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f'http://127.0.0.1:{PORT}/tools/export.html')
        page.wait_for_function('window.__EXPORTS_READY__ === true')
        items = page.evaluate('''() => Object.entries(window.__EXPORTS__).map(([key, cv]) => ({
            key, w: cv.width, h: cv.height, dataUrl: cv.toDataURL('image/png')
        }))''')
        scene_diff = page.evaluate('() => window.__SCENE_DIFF__')
        diff = page.evaluate('() => window.__DIFF__')
        browser.close()
    return items, scene_diff, diff


def main():
    threading.Thread(target=serve_forever, daemon=True).start()
    items, scene_diff, _ = collect()

    # 页内自检：超容差（hard）差异必须为 0，否则不写任何文件
    if scene_diff is None:
        print('页内自检未运行（__SCENE_DIFF__ 为空）')
        sys.exit(1)
    bad = {k: v['hard'] for k, v in scene_diff.items() if v['hard'] != 0}
    if bad:
        print(f'页内自检失败（素材组装 ≠ 旧渲染，超容差差异）：{bad}')
        sys.exit(1)
    print('页内自检通过：' + ', '.join(f"{k} hard=0 soft={v['soft']}" for k, v in scene_diff.items()))

    # 全量重建 tiles/（删掉已不用的旧变体）；整图方案的 scenes/ 废弃删除
    tiles_dir = IMG_DIR / 'tiles'
    if tiles_dir.exists():
        shutil.rmtree(tiles_dir)
    tiles_dir.mkdir(parents=True, exist_ok=True)
    scenes_dir = IMG_DIR / 'scenes'
    if scenes_dir.exists():
        shutil.rmtree(scenes_dir)

    # 内容去重：相同 PNG 字节只存一份，多个 key 指向同一文件
    manifest, blob_to_file, counters = {}, {}, {}
    for item in items:
        assert item['w'] == 32 and item['h'] == 32, f"{item['key']} 尺寸 {item['w']}x{item['h']} 应为 32x32"
        png = base64.b64decode(item['dataUrl'].split(',', 1)[1])
        digest = hashlib.sha1(png).hexdigest()
        if digest not in blob_to_file:
            style = item['key'].split('|')[0].replace('tiles/', '')
            counters[style] = counters.get(style, 0) + 1
            filename = f"{style}-{counters[style]:03d}.png"
            (tiles_dir / filename).write_bytes(png)
            blob_to_file[digest] = filename
        manifest[item['key']] = {'path': f"img/tiles/{blob_to_file[digest]}", 'w': 32, 'h': 32}
    (IMG_DIR / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f"manifest.json 写入 {len(manifest)} 项，去重后文件 {len(blob_to_file)} 个")

    # 二次校验：重载页面，从磁盘 PNG 重载素材再组装再对比
    _, _, diff = collect()
    if diff is None:
        print('警告：二次校验未生效（manifest 未找到？）')
        sys.exit(1)
    bad = {k: v['hard'] for k, v in diff.items() if v['hard'] != 0}
    for k, v in diff.items():
        print(f"PNG 回读校验 {k}: hard={v['hard']} soft={v['soft']}")
    if bad:
        print(f'PNG 回读校验失败（超容差差异）：{bad}')
        sys.exit(1)
    print('PNG 回读校验通过 ✓')


if __name__ == '__main__':
    main()
