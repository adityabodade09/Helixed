import { Router } from 'express';
import type { AccountSettingsService } from '../account-settings/account-settings.service.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';

export function createStudentSettingsRouter(
  auth: AuthService,
  accountSettings: AccountSettingsService,
) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const settings = await accountSettings.get(request.principal!);
    response.json({ sessions: settings.sessions });
  });
  router.post('/logout-all', async (request, response) => {
    await auth.logoutAll(request.principal!.userId);
    response.status(204).send();
  });
  return router;
}
