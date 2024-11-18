import { ProductProjectionPagedQueryResponse } from '@commercetools/platform-sdk';

import { createApiRoot } from '../client/create.client';
import { getAll, getAndFilterProductsBasedOnReviewCriteria } from './modifier.productProjection';
import { GetFunction } from '../types/index.types';
import { logger } from '../utils/logger.utils';

const searchProductProjections: GetFunction<ProductProjectionPagedQueryResponse> = async (queryArgs) => {
  // Return all the reviews
  // const { body } = await createApiRoot().productProjections().search().get({ queryArgs }).execute();
  logger.info(`searchProductProjections`)

  const { body } = await createApiRoot().productProjections().search().get({ queryArgs}).execute();
  return body;
};

export const productProjectionSearch: GetFunction<ProductProjectionPagedQueryResponse> =
  getAll(searchProductProjections);

export const getReviewCriteriaFilteredProducts: GetFunction<ProductProjectionPagedQueryResponse> =
getAndFilterProductsBasedOnReviewCriteria(searchProductProjections);
