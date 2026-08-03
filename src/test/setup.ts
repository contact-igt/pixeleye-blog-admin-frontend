import '@testing-library/jest-dom/vitest';
import { loadEnv } from 'vite';

const envFromDotfiles = loadEnv('test', process.cwd(), '');
for (const [key, value] of Object.entries(envFromDotfiles)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

if (!Element.prototype.getClientRects) Object.defineProperty(Element.prototype, 'getClientRects', { value: () => [] });
if (!Range.prototype.getClientRects) Object.defineProperty(Range.prototype, 'getClientRects', { value: () => [] });
if (!Range.prototype.getBoundingClientRect) Object.defineProperty(Range.prototype, 'getBoundingClientRect', { value: () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) }) });


if (!document.elementFromPoint) document.elementFromPoint = () => document.body;

