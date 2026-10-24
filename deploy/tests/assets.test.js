'use strict';
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPS } from '../../src/data/maps/index.js';

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const imgDir = path.join(root, 'src/assent/img');
const manifestPath = path.join(imgDir, 'manifest.json');

function pngSize(file) {
  const buf = readFileSync(file);
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${file} 不是合法 PNG`);
  assert.equal(buf.toString('ascii', 12, 16), 'IHDR', `${file} 缺 IHDR`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

test('manifest 存在且 4 张场景图齐全、尺寸与地图一致、非空白', () => {
  assert.ok(existsSync(manifestPath), '缺少 src/assent/img/manifest.json（先跑 python tools/export.py）');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const name of ['atrium', 'reading', 'toilet', 'outside']) {
    const key = `scenes/${name}`;
    const meta = manifest[key];
    assert.ok(meta, `manifest 缺少 ${key}`);
    const file = path.join(root, 'src/assent', meta.path);
    assert.ok(existsSync(file), `缺少文件 ${meta.path}`);
    const { w, h } = pngSize(file);
    assert.equal(w, meta.w, `${key} manifest 宽度与实际不符`);
    assert.equal(h, meta.h, `${key} manifest 高度与实际不符`);
    const cols = MAPS[name].map[0].length, rows = MAPS[name].map.length;
    assert.equal(w, cols * 32, `${key} 宽度应为 格子数×32`);
    assert.equal(h, rows * 32, `${key} 高度应为 格子数×32`);
    assert.ok(statSync(file).size > 4000, `${key} 文件过小，疑似空白图`);
  }
});
