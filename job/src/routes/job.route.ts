import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { get, post } from '../controllers/job.controller';

// Create the router for our app
const jobRouter: Router = Router();

jobRouter.post('/post', async (req, res, next) => {
  logger.info('Job post message received');

  try {
    await post(req, res);
  } catch (error) {
    next(error);
  }
});
jobRouter.get('/get', async (req, res, next) => {
  logger.info('Job get message received');

  try {
    await get(res);
  } catch (error) {
    next(error);
  }
});

export default jobRouter;
