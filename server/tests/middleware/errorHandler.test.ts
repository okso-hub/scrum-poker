// tests/errorHandler.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, asyncHandler } from '../../src/middleware/errorHandler.js';
import { AppError } from '../../src/types/index.js';

describe('errorHandler', () => {
  let req: Request;
  let res: Response & { statusMock: ReturnType<typeof vi.fn> };
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    next = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should send AppError payload and code', () => {
    const err = new AppError('Not allowed', 403, 'FORBIDDEN');
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Not allowed',
      code: 'FORBIDDEN',
    });
  });

  it('should send 500 for unknown errors', () => {
    const err = new Error('something broke');
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });
});

describe('asyncHandler', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {} as Response;
    next = vi.fn();
  });

  it('should call next(err) if the inner fn rejects', async () => {
    const boom = new Error('boom!');
    const badFn = async () => { throw boom };
    const wrapped = asyncHandler(badFn);

    // call the wrapped function and await microtask completion
    wrapped(req, res, next);
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(boom);
  });

  it('should call inner fn exactly once on success', async () => {
    const successFn = vi.fn(async () => { return 'ok' });
    const wrapped = asyncHandler(successFn);

    await wrapped(req, res, next);

    expect(successFn).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });
});
