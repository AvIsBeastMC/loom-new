import { Router, type Router as ExpressRouter } from 'express';
import auth from './auth';
import discord from './discord';
import reports from './reports';
import serverSettings from './server-settings';
import violations from './violations';
import system from './system';

const router: ExpressRouter = Router();

router.use(auth);
router.use(discord);
router.use(reports);
router.use(serverSettings);
router.use(violations);
router.use(system);

export default router;