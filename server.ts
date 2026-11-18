import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  bootstrapUserData,
  TabOperationError,
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
import {
  validateId,
  validatePreferences,
  validateRecurringRule,
  validateTab,
  validateTask,
} from './src/apiValidation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== 'development' && nodeEnv !== 'production') {
    throw new Error(
      'Invalid or missing NODE_ENV. Set NODE_ENV explicitly to "development" or "production".'
    );
  }

  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );

    const scriptSources =
      nodeEnv === 'development'
        ? "'self' 'unsafe-inline' 'unsafe-eval'"
        : "'self' 'unsafe-inline'";
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      `script-src ${scriptSources} https://apis.google.com https://*.googleapis.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.googleusercontent.com https://*.gstatic.com",
      "connect-src 'self' ws: wss: https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://*.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://*.google.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);

    if (
      nodeEnv === 'production' &&
      (_req.secure ||
        String(_req.headers['x-forwarded-proto'] || '')
          .split(',')[0]
          .trim() === 'https')
    ) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
  });
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (error && typeof error === 'object' && 'status' in error) {
        const status = Number((error as { status?: number }).status);
        if (status === 413) {
          res.status(400).json({ error: 'Request payload is too large.' });
          return;
        }
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({ error: 'Malformed JSON request.' });
        return;
      }
      next(error);
    }
  );

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
      const body = req.body;
      if (
        !body ||
        typeof body !== 'object' ||
        !Array.isArray(body.tabs) ||
        !Array.isArray(body.tasks) ||
        !Array.isArray(body.recurringRules) ||
        body.tabs.length > 500 ||
        body.tasks.length > 5000 ||
        body.recurringRules.length > 5000 ||
        !body.tabs.every(validateTab) ||
        !body.tasks.every(validateTask) ||
        !body.recurringRules.every(validateRecurringRule) ||
        !validatePreferences(body.themeSettings, body.reminderPrefs)
      ) {
        res.status(400).json({ error: 'Malformed import data.' });
        return;
      }
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
      const hasPreferenceUpdate =
        req.body &&
        typeof req.body === 'object' &&
        (req.body.themeSettings !== undefined || req.body.reminderPrefs !== undefined);
      if (
        !hasPreferenceUpdate ||
        !validatePreferences(req.body.themeSettings, req.body.reminderPrefs)
      ) {
        res.status(400).json({ error: 'Malformed preference data.' });
        return;
      }
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
      if (!validateTab(req.body)) {
        res.status(400).json({ error: 'Malformed tab data.' });
        return;
      }
      const saved = await upsertTabInDb(req.user!.uid, req.body);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to save tab' });
    }
  });

  app.delete('/api/tabs/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!validateId(req.params.id)) {
        res.status(400).json({ error: 'Invalid tab ID.' });
        return;
      }
      const fallbackTabId = String(req.query.fallbackTabId || '');
      await deleteTabInDb(req.user!.uid, String(req.params.id), fallbackTabId);
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof TabOperationError) {
        const status = error.code === 'NOT_FOUND' ? 404 : 400;
        res.status(status).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: (error as Error).message || 'Failed to delete tab' });
    }
  });

  // Tasks & 30-day Soft-Delete Trash
  app.post('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!validateTask(req.body)) {
        res.status(400).json({ error: 'Malformed task data.' });
        return;
      }
      const saved = await upsertTask(req.user!.uid, req.body);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to save task' });
    }
  });

  app.put('/api/tasks/reorder', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : [];
      if (
        orderedIds.length > 5000 ||
        !orderedIds.every(validateId)
      ) {
        res.status(400).json({ error: 'Malformed task reorder data.' });
        return;
      }
      await reorderTasksInDb(req.user!.uid, orderedIds);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to reorder tasks' });
    }
  });

  app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!validateId(req.params.id)) {
        res.status(400).json({ error: 'Invalid task ID.' });
        return;
      }
      const deletedAt = await softDeleteTaskInDb(req.user!.uid, String(req.params.id));
      res.json({ ok: true, deletedAt });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to move task to trash' });
    }
  });

  app.post('/api/tasks/:id/restore', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!validateId(req.params.id)) {
        res.status(400).json({ error: 'Invalid task ID.' });
        return;
      }
      const restored = await restoreTaskInDb(req.user!.uid, String(req.params.id));
      res.json({ ok: true, task: restored });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to restore task' });
    }
  });

  app.delete('/api/tasks/:id/permanent', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!validateId(req.params.id)) {
        res.status(400).json({ error: 'Invalid task ID.' });
        return;
      }
      await permanentDeleteTaskInDb(req.user!.uid, String(req.params.id));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to delete task permanently' });
    }
  });

  // Recurring Rules
  app.post('/api/recurring', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!validateRecurringRule(req.body)) {
        res.status(400).json({ error: 'Malformed recurring-rule data.' });
        return;
      }
      const saved = await upsertRecurringRule(req.user!.uid, req.body);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to save recurring rule' });
    }
  });

  app.delete('/api/recurring/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!validateId(req.params.id)) {
        res.status(400).json({ error: 'Invalid recurring-rule ID.' });
        return;
      }
      await softDeleteRecurringInDb(req.user!.uid, String(req.params.id));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || 'Failed to delete recurring rule' });
    }
  });

  // Vite dev middleware or static dist serving
  if (nodeEnv === 'development') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
      throw new Error('Production dist directory or dist/index.html is missing. Run npm run build first.');
    }
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
