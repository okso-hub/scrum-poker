// tests/requireAdminAccess.spec.ts
import { describe, it, expect, vi, afterEach, Mock } from 'vitest';
import { requireAdminAccess } from '../../src/middleware/adminAuth';
import { roomService } from '../../src/services/index.js';
import { BadRequestError, ForbiddenError } from '../../src/types/index.js';
import type { Request, Response, NextFunction } from 'express';
import * as validation from '../../src/utils/validation.js';

describe('requireAdminAccess middleware', () => {
    const mockNext = vi.fn() as Mock;
    const mockReq = (params: Record<string, any>, ip?: string): Request =>
    ({ params, ip } as unknown as Request);
  const mockRes = {} as Response;

  afterEach(() => {
    vi.restoreAllMocks();
    mockNext.mockReset();
  });

  
 it('should call next with BadRequestError if validateRoomId returns falsy', () => {
    // stub validateRoomId to return a falsy value
    vi.spyOn(validation, 'validateRoomId').mockReturnValue(undefined as any);

    const req = mockReq({ roomId: 'some-invalid-id' }, '1.2.3.4');

    requireAdminAccess(req, mockRes, mockNext);

    // validateRoomId should have been called with the raw param
    expect(validation.validateRoomId).toHaveBeenCalledWith('some-invalid-id');
    expect(mockNext).toHaveBeenCalledOnce();
    const err = mockNext.mock.calls[0]![0];
    expect(err).toBeInstanceOf(BadRequestError);
    expect((err as Error).message).toBe('roomId is required');
  });

  it('should call next with ForbiddenError if user is not admin', () => {
    // stub isAdmin to return false
    vi.spyOn(roomService, 'isAdmin').mockReturnValue(false);

    const req = mockReq({ roomId: 42 }, '5.6.7.8');

    requireAdminAccess(req, mockRes, mockNext);

    expect(roomService.isAdmin).toHaveBeenCalledWith(42, '5.6.7.8');
    expect(mockNext).toHaveBeenCalledOnce();
    const err = mockNext.mock.calls[0]![0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect((err as Error).message).toBe('Admin access required for this operation');
  });

  it('should call next with no args if user is admin', () => {
    // stub isAdmin to return true
    vi.spyOn(roomService, 'isAdmin').mockReturnValue(true);

    const req = mockReq({ roomId: 42 }, '9.10.11.12');

    requireAdminAccess(req, mockRes, mockNext);

    expect(roomService.isAdmin).toHaveBeenCalledWith(42, '9.10.11.12');
    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockNext).toHaveBeenCalledWith(); // no error
  });
});
