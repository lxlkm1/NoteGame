#!/usr/bin/env python3
# normalize-ai.py —— AI 生成图 → 游戏素材规范化：缩放到 32×32 → 限色 → 对齐游戏调色板 → 可选抠背景
# 用法：/home/lxl/miniforge3/envs/opencode/bin/python tools/normalize-ai.py [inbox 目录]
# 契约：收件箱里的文件名 == 目标素材文件名（如 wall-001.png），处理后直接覆盖 --out 里的同名文件
import argparse
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TILES_DIR = ROOT / 'src' / 'assent' / 'img' / 'tiles'
DEFAULT_INBOX = ROOT / 'assets-ai' / 'inbox'


def rgba_pixels(im):
    d = im.tobytes()
    return [(d[i], d[i + 1], d[i + 2], d[i + 3]) for i in range(0, len(d), 4)]


def rgb_pixels(im):
    d = im.tobytes()
    return [(d[i], d[i + 1], d[i + 2]) for i in range(0, len(d), 3)]


def build_palette():
    """游戏调色板 = 现有地块素材里的全部不透明颜色（chessSeat 除外——其 AA 汉字中间色不应成为目标色）"""
    colors = set()
    for png in sorted(TILES_DIR.glob('*.png')):
        if png.name.startswith('chessSeat-'):
            continue
        im = Image.open(png).convert('RGBA')
        for r, g, b, a in rgba_pixels(im):
            if a == 255:
                colors.add((r, g, b))
    return sorted(colors)


def nearest(color, palette):
    cr, cg, cb = color
    best, best_d = None, None
    for p in palette:
        d = (cr - p[0]) ** 2 + (cg - p[1]) ** 2 + (cb - p[2]) ** 2
        if best_d is None or d < best_d:
            best, best_d = p, d
    return best


def parse_color(s):
    s = s.lstrip('#')
    assert len(s) == 6, f'颜色应为 #rrggbb：{s}'
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def key_out(im, key, tol):
    """把接近 key 颜色的像素置为透明（用于角色/道具图抠纯色背景）"""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if (r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2 <= tol * tol:
                px[x, y] = (r, g, b, 0)
    return im


def normalize(src, palette, n_colors, key=None, key_tol=40, snap=True):
    im = Image.open(src).convert('RGBA')
    im = im.resize((32, 32), Image.NEAREST)  # 最近邻：保住像素块的硬边
    mask = None
    if key is not None:
        im = key_out(im, key, key_tol)
        mask = [a for *_rgb, a in rgba_pixels(im)]
        # 抠掉的像素用剩余主色顶替，避免背景色占用限色名额（alpha 仍保持 0）
        opaque = [c[:3] for c in rgba_pixels(im) if c[3] == 255]
        if opaque and len(opaque) < len(mask):
            fill = Counter(opaque).most_common(1)[0][0]
            px = im.load()
            for y in range(im.height):
                for x in range(im.width):
                    if px[x, y][3] == 0:
                        px[x, y] = (*fill, 0)
    rgb = im.convert('RGB')
    # 先限色（中位切分）把 AI 的渐变/阴影收成平涂色块，再逐色对齐游戏调色板
    q = rgb.quantize(colors=n_colors, method=Image.MEDIANCUT).convert('RGB')
    if snap and palette:
        lut = {}
        out = Image.new('RGB', q.size)
        out.putdata([lut.setdefault(c, nearest(c, palette)) for c in rgb_pixels(q)])
        q = out
    if mask is not None:
        q = q.convert('RGBA')
        q.putalpha(Image.frombytes('L', q.size, bytes(mask)))
    return q


def main():
    ap = argparse.ArgumentParser(description='AI 生成图 → 32×32 游戏素材')
    ap.add_argument('inbox', nargs='?', default=str(DEFAULT_INBOX))
    ap.add_argument('--out', default=str(TILES_DIR), help='输出目录（默认覆盖地块素材）')
    ap.add_argument('--colors', type=int, default=5, help='每张图最多保留几种颜色（默认 5）')
    ap.add_argument('--key-out', default=None, help='抠掉的颜色，如 "#ff00ff"（角色/道具用）')
    ap.add_argument('--key-tol', type=int, default=40, help='抠色容差（默认 40）')
    ap.add_argument('--no-palette', action='store_true', help='不对齐游戏调色板（只做限色）')
    ap.add_argument('--only', default=None, help='只处理指定文件（逗号分隔，如 wall-001.png,grass-001.png）')
    ap.add_argument('--dry-run', action='store_true', help='只报告，不写文件')
    args = ap.parse_args()

    inbox = Path(args.inbox)
    if not inbox.is_dir():
        print(f'收件箱不存在：{inbox}')
        sys.exit(1)
    files = sorted(p for p in inbox.iterdir() if p.suffix.lower() == '.png')
    if args.only:
        wanted = set(args.only.split(','))
        files = [p for p in files if p.name in wanted]
    if not files:
        print(f'收件箱里没有 PNG：{inbox}')
        sys.exit(1)

    palette = [] if args.no_palette else build_palette()
    if not args.no_palette:
        print(f'游戏调色板：{len(palette)} 色（来自现有地块素材，chessSeat 除外）')
    key = parse_color(args.key_out) if args.key_out else None
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    for f in files:
        out = normalize(f, palette, args.colors, key, args.key_tol, snap=not args.no_palette)
        dest = out_dir / f.name
        used = len(set(c for c in rgba_pixels(out.convert('RGBA')) if c[3] > 0))
        action = '预览' if args.dry_run else '写入'
        print(f'{action} {f.name}: 32x32, {used} 色 → {dest}')
        if not args.dry_run:
            out.save(dest)


if __name__ == '__main__':
    main()
