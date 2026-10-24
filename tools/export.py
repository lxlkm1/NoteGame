#!/usr/bin/env python3
# export.py —— 用 Playwright 打开 tools/export.html，把 window.__EXPORTS__ 的 canvas 存为 PNG 并写 manifest.json
# 用法：/home/lxl/miniforge3/envs/opencode/bin/python tools/export.py
import base64
import functools
import http.server
import json
import socketserver
import threading
import sys
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
    """打开导出页，返回 (items, expected, diff)。items: [{key, w, h, dataUrl}]"""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f'http://127.0.0.1:{PORT}/tools/export.html')
        page.wait_for_function('window.__EXPORTS_READY__ === true')
        items = page.evaluate('''() => Object.entries(window.__EXPORTS__).map(([key, cv]) => ({
            key, w: cv.width, h: cv.height, dataUrl: cv.toDataURL('image/png')
        }))''')
        expected = page.evaluate('() => window.__EXPECTED__')
        diff = page.evaluate('() => window.__DIFF__')
        browser.close()
    return items, expected, diff


def main():
    threading.Thread(target=serve_forever, daemon=True).start()
    items, expected, diff = collect()

    # 尺寸断言：canvas 尺寸必须等于 地图格子数 × TILE × ART_SCALE
    for item in items:
        exp = expected[item['key']]
        assert (item['w'], item['h']) == (exp['w'], exp['h']), \
            f"{item['key']} 尺寸 {item['w']}x{item['h']} 与期望 {exp['w']}x{exp['h']} 不符"

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for item in items:
        png = base64.b64decode(item['dataUrl'].split(',', 1)[1])
        rel = f"img/{item['key']}.png"
        dest = ROOT / 'src' / 'assent' / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(png)
        manifest[item['key']] = {'path': rel, 'w': item['w'], 'h': item['h']}
        print(f"导出 {rel}（{item['w']}x{item['h']}，{len(png)} 字节）")

    (IMG_DIR / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f"manifest.json 写入 {len(manifest)} 项")

    # 二次打开页面做像素校验（此时 manifest 已存在，__DIFF__ 生效）
    _, _, diff = collect()
    if diff is None:
        print('警告：校验模式未生效（manifest 未找到？）')
        sys.exit(1)
    bad = {k: v for k, v in diff.items() if v != 0}
    for k, v in diff.items():
        print(f"像素对比 {k}: {'一致' if v == 0 else v}")
    if bad:
        print(f'校验失败：{bad}')
        sys.exit(1)
    print('全部像素一致 ✓')


if __name__ == '__main__':
    main()
