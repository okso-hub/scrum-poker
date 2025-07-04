// tests/requireAdminAccess.spec.ts
import { describe, it, expect, vi, afterEach, Mock } from 'vitest';
import { requireAdminAccess } from '../../src/middleware/adminAuth';
import { roomService } from '../../src/services/index.js';
import { BadRequestError, ForbiddenError } from '../../src/types/index.js';
import type { Request, Response, NextFunction } from 'express';

describe('requireAdminAccess middleware', () => {
    const mockNext = vi.fn() as Mock;
    const mockReq = (params: Record<string, any>, ip?: string): Request =>
    ({ params, ip } as unknown as Request);
  const mockRes = {} as Response;

  afterEach(() => {
    vi.restoreAllMocks();
    mockNext.mockReset();
  });

  it('should call next with BadRequestError if roomId is missing', () => {
    const req = mockReq({}, '1.2.3.4');

    requireAdminAccess(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledOnce();
    const err = mockNext.mock.calls[0]![0];
    expect(err).toBeInstanceOf(BadRequestError);
    expect((err as Error).message).toBe('roomId is required');
  });

  it('should call next with ForbiddenError if user is not admin', () => {
    // stub isAdmin to return false
    vi.spyOn(roomService, 'isAdmin').mockReturnValue(false);

    const req = mockReq({ roomId: 'room42' }, '5.6.7.8');

    requireAdminAccess(req, mockRes, mockNext);

    expect(roomService.isAdmin).toHaveBeenCalledWith('room42', '5.6.7.8');
    expect(mockNext).toHaveBeenCalledOnce();
    const err = mockNext.mock.calls[0]![0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect((err as Error).message).toBe('Admin access required for this operation');
  });

  it('should call next with no args if user is admin', () => {
    // stub isAdmin to return true
    vi.spyOn(roomService, 'isAdmin').mockReturnValue(true);

    const req = mockReq({ roomId: 'room42' }, '9.10.11.12');

    requireAdminAccess(req, mockRes, mockNext);

    expect(roomService.isAdmin).toHaveBeenCalledWith('room42', '9.10.11.12');
    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockNext).toHaveBeenCalledWith(); // no error
  });
});
