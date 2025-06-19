import server from '../src/index.js';
import { afterAll, describe, it, expect } from 'vitest';

describe('Express Server', () => {
  it('exports a server instance', () => {
    expect(server).toBeDefined();
  });

  afterAll((context) => {
    server.close();
  });
});
