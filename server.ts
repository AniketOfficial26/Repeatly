import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  bootstrapUserData,
  deleteTabInDb,
  importGuestDataForNewUser,
  permanentDeleteTaskInDb,
  purgeExpiredDeletedItems,
  reorderTasksInDb,
  restoreTaskInDb,
  saveUserPreferencesInDb,
  softDeleteRecurringInDb,
  softDeleteTaskInDb,
  upsertRecurringRule,
  upsertTabInDb,
  upsertTask,
} from './src/db/repository.ts';
import { type AuthRequest, requireAuth } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'repeatly-api' });
  });

  // Bootstrap user session, run 30-day retention purge, and return cloud state
  app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'user@repeatly.app';
      const name = typeof req.user!.name === 'string' ? req.user!.name : undefined;
      const data = await bootstrapUserData(uid, email, name);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Bootstrap failed' });
    }
  });

  app.post('/api/import-local', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'user@repeatly.app';
      const name = typeof req.user!.name === 'string' ? req.user!.name : undefined;
      await bootstrapUserData(uid, email, name);
      await importGuestDataForNewUser(uid, req.body);
      const updated = await bootstrapUserData(uid, email, name);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Import failed' });
    }
  });

  app.put('/api/preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
      await saveUserPreferencesInDb(
        req.user!.uid,
        req.body.themeSettings,
        req.body.reminderPrefs
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to save preferences' });
    }
  });

  // Tabs
  app.post('/api/tabs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const saved = await upsertTabInDb(req.user!.uid, req.body);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to save tab' });
    }
  });

  app.delete('/api/tabs/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const fallbackTabId = String(req.query.fallbackTabId || '');
      await deleteTabInDb(req.user!.uid, String(req.params.id), fallbackTabId);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to delete tab' });
    }
  });

  // Tasks & 30-day Soft-Delete Trash
  app.post('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const saved = await upsertTask(req.user!.uid, req.body);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to save task' });
    }
  });

  app.put('/api/tasks/reorder', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : [];
      await reorderTasksInDb(req.user!.uid, orderedIds);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to reorder tasks' });
    }
  });

  app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const deletedAt = await softDeleteTaskInDb(req.user!.uid, String(req.params.id));
      res.json({ ok: true, deletedAt });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to move task to trash' });
    }
  });

  app.post('/api/tasks/:id/restore', requireAuth, async (req: AuthRequest, res) => {
    try {
      const restored = await restoreTaskInDb(req.user!.uid, String(req.params.id));
      res.json({ ok: true, task: restored });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to restore task' });
    }
  });

  app.delete('/api/tasks/:id/permanent', requireAuth, async (req: AuthRequest, res) => {
    try {
      await permanentDeleteTaskInDb(req.user!.uid, String(req.params.id));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to delete task permanently' });
    }
  });

  // Recurring Rules
  app.post('/api/recurring', requireAuth, async (req: AuthRequest, res) => {
    try {
      const saved = await upsertRecurringRule(req.user!.uid, req.body);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to save recurring rule' });
    }
  });

  app.delete('/api/recurring/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      await softDeleteRecurringInDb(req.user!.uid, String(req.params.id));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to delete recurring rule' });
    }
  });

  // Vite dev middleware or static dist serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use('/api', (_req, res) => {
      res.status(404).json({ error: 'API route not found' });
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Periodic background purge every 6 hours for >30-day soft-deleted records
  const purgeIntervalMs = 6 * 60 * 60 * 1000;
  const timer = setInterval(() => {
    purgeExpiredDeletedItems().catch((err) => {
      console.error('Scheduled 30-day purge error:', err);
    });
  }, purgeIntervalMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Repeatly server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
