import { Router, Response } from 'express';
import { db } from '../../database/store.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();

// GET all audit logs (Super Admin and Admin only)
router.get('/', authenticateJWT, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  res.json(db.auditLogs);
});

export default router;
