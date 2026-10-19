import { Router, Request, Response, NextFunction } from 'express';
import { dbStore } from '../services/dbStore.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/activity (Enriched with unread tracking & time periods)
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const result = await dbStore.getActivities(userId, 60);
    res.json({
      success: true,
      data: result.activities,
      unreadCount: result.unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/activity/:id/read (Mark single activity as read)
router.post('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await dbStore.markActivityRead(req.params.id, userId);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/activity/mark-all-read (Mark all activities as read)
router.post('/mark-all-read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await dbStore.markAllActivitiesRead(userId);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/activity/preferences (Notification preferences)
router.get('/preferences', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const preferences = await dbStore.getNotificationPreferences(userId);
    res.json({
      success: true,
      data: preferences,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/activity/preferences (Update notification preferences)
router.put('/preferences', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const preferences = await dbStore.updateNotificationPreferences(userId, req.body);
    res.json({
      success: true,
      data: preferences,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
