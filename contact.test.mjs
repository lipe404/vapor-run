import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collisionResponse, sweptContact } from './contact.mjs';

const hit = (trajectory) => sweptContact({ halfX: 1, halfZ: 2, ...trajectory });
const response = (contact, overrides = {}) => collisionResponse({
  contact, speed: 160, otherSpeed: 150, lateralSpeed: 0, otherLateralSpeed: 0, ...overrides,
});

test('detects pass-through when neither endpoint overlaps', () => {
  assert.deepEqual(hit({ dx0: 0, dz0: 10, dx1: 0, dz1: -10 }), { t: 0.4, axis: 'z', side: 1 });
  assert.deepEqual(hit({ dx0: -4, dz0: 0, dx1: 4, dz1: 0 }), { t: 0.375, axis: 'x', side: -1 });
});

test('misses if lateral and longitudinal intervals do not intersect', () => {
  assert.equal(hit({ dx0: 1.01, dz0: 10, dx1: 1.01, dz1: -10 }), null);
  assert.equal(hit({ dx0: 0, dz0: 4, dx1: 4, dz1: 0 }), null);
});

test('handles stationary overlaps, shells, and misses', () => {
  assert.deepEqual(hit({ dx0: -0.8, dz0: 0.4, dx1: -0.8, dz1: 0.4 }), { t: 0, axis: 'x', side: -1 });
  assert.deepEqual(hit({ dx0: 0, dz0: 1.9, dx1: 0, dz1: 1.9 }), { t: 0, axis: 'z', side: 1 });
  assert.equal(hit({ dx0: 0, dz0: 2.1, dx1: 0, dz1: 2.1 }), null);
});

test('frontal scrape and hard impact scale without reversing or boosting the player', () => {
  const face = { t: .5, axis: 'z', side: 1 };
  const light = response(face);
  const hard = response(face, { otherSpeed: 47 });
  assert.equal(light.severity, 'scrape');
  assert.equal(hard.severity, 'hit');
  assert(hard.energy > light.energy);
  assert(hard.speed >= 0 && hard.speed < light.speed && light.speed <= 160);
  assert.equal(response(face, { otherSpeed: 200 }).speed, 160);
  assert.equal(response(face, { speed: -3, otherSpeed: 0 }).speed, 0);
});

test('side shove is consistently directed away from the other car', () => {
  const left = response({ t: 0, axis: 'x', side: -1 }, { lateralSpeed: -2 });
  const right = response({ t: 0, axis: 'x', side: 1 }, { lateralSpeed: 2 });
  const separating = response({ t: 0, axis: 'x', side: 1 }, { lateralSpeed: -2 });
  assert(left.shove > 0 && right.shove < 0);
  assert.equal(left.speed, right.speed);
  assert.equal(left.severity, 'hit');
  assert.equal(separating.speed, 160);
  assert.equal(separating.energy, 0);
});
