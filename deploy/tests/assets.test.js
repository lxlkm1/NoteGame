'use strict';
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPS } from '../../src/data/maps/index.js';
import { tileKey } from '../../src/tile-key.js';

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const manifestPath = path.join(root, 'src/assent/img/manifest.json');

// 文件级校验：存在 + PNG 魔数 + IHDR 32×32 + 非空白
function checkPngFile(meta) {
  const file = path.join(root, 'src/assent', meta.path);
  assert.ok(existsSync(file), `缺少文件 ${meta.path}`);
  const buf = readFileSync(file);
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${meta.path} 不是合法 PNG`);
  assert.equal(buf.toString('ascii', 12, 16), 'IHDR');
  assert.equal(buf.readUInt32BE(16), 32, `${meta.path} 宽度应为 32`);
  assert.equal(buf.readUInt32BE(20), 32, `${meta.path} 高度应为 32`);
  assert.ok(statSync(file).size > 50, `${meta.path} 文件过小，疑似空白`);
}

test('manifest 覆盖 4 张地图实际用到的全部地块素材，且文件为合法 32×32 PNG', () => {
  assert.ok(existsSync(manifestPath), '缺少 src/assent/img/manifest.json（先跑 python tools/export.py）');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const checked = new Set();
  for (const name of ['atrium', 'reading', 'toilet', 'outside']) {
    const { map } = MAPS[name];
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        const key = 'tiles/' + tileKey(map[r][c], c, r, MAPS.tiles, MAPS[name]);
        const meta = manifest[key];
        assert.ok(meta, `场景 ${name} (${c},${r}) 字符 '${map[r][c]}' 缺素材 ${key}`);
        assert.equal(meta.w, 32); assert.equal(meta.h, 32);
        if (checked.has(meta.path)) continue;
        checked.add(meta.path);
        checkPngFile(meta);
      }
    }
  }
});

test('manifest 含外墙亮窗覆盖层', () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const meta = manifest['tiles/facade-window'];
  assert.ok(meta, '缺 tiles/facade-window（先跑 python tools/export.py）');
  assert.equal(meta.w, 32); assert.equal(meta.h, 32);
  checkPngFile(meta); // 此 key 由运行时直接查用、不经 tileKey，第一个用例覆盖不到，需单独校验文件
});
