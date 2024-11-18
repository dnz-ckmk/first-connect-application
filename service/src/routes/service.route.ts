import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { post, get } from '../controllers/service.controller';

const serviceRouter = Router();

serviceRouter.post('/', async (req, res, next) => {
  logger.info('Service post message received');

  try {
    await post(req, res);
  } catch (error) {
    next(error);
  }
});

serviceRouter.get('/', async (req, res, next) => {
  logger.info('Service get request received');

  try {
    await get(req, res);
  } catch (error) {
    next(error);
  }
});

export default serviceRouter;
