import { ReviewPagedQueryResponse } from '@commercetools/platform-sdk';

import { createApiRoot } from '../client/create.client';
import { getAll } from '../reviews/modifier.review';
import { GetFunction } from '../types/index.types';

const getReviews: GetFunction<ReviewPagedQueryResponse> = async (queryArgs) => {
  // Return all the reviews
  const { body } = await createApiRoot().reviews().get({ queryArgs }).execute();
  return body;
};

export const allReviews: GetFunction<ReviewPagedQueryResponse> =
  getAll(getReviews);
