import { describe, expect, it } from 'vitest';
import { wasmBinary } from '../src/index';

describe('wasmBinary', () => {
  it('exports wasmBinary as a Uint8Array', () => {
    expect(wasmBinary).toBeInstanceOf(Uint8Array);
    expect(wasmBinary.length).toBeGreaterThan(100_000);
  });

  it('contains a valid WASM magic number', () => {
    expect(wasmBinary[0]).toBe(0x00);
    expect(wasmBinary[1]).toBe(0x61);
    expect(wasmBinary[2]).toBe(0x73);
    expect(wasmBinary[3]).toBe(0x6d);
  });
});
