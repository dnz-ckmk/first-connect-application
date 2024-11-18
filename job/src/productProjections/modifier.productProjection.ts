// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { parseFloatToFixedTwo } from "../helpers/numberHelper";
import { logger } from '../utils/logger.utils';

function getAll(getFunction) {
  return async function getAll(queryArgs) {
    async function recur(
      { sort, limit = process.env.MAX_ITEMS, where },
      lastResults: object | undefined = undefined,
      results = []
    ) {
      const id = lastResults?.results?.slice(-1)[0]?.id;

      const { total, count } = lastResults || {};

      if (lastResults && total === count) {
        return {
          offset: 0,
          results,
          count: results.length,
          total: results.length,
          limit: results.length,
        };
      }

      if (id) {
        where = where ? `id < "${id}" and (${where})` : `id < "${id}"`;
      }

      sort = sort ? [`id desc`, ...sort] : 'id desc';

      return getFunction({
        sort,
        limit,
        where,
      }).then((res) => {
        return recur(queryArgs, res, results.concat(res.results));
      });
    }

    return await recur(queryArgs);
  };
}

function getAndFilterProductsBasedOnReviewCriteria(getFunction) {
  logger.info(`getAndFilterProductsBasedOnReviewCriteria`)

  return async function getReviewCriteriaFilteredProducts(queryArgs) {
    async function recur(
      { sort, limit = process.env.MAX_ITEMS, where, filter, expand },
      lastResults: object | undefined = undefined,
      results = []
    ) {
      logger.info(`getAndFilterProductsBasedOnReviewCriteria, lastResults:${lastResults}`)

      const id = lastResults?.results?.slice(-1)[0]?.id;
      const { total, count } = lastResults || {};

      if (lastResults && total === count) {
        return {
          offset: 0,
          results,
          count: results.length,
          total: results.length,
          limit: results.length,
        };
      }

      if (id) {
        where = where ? `id < "${id}" and (${where})` : `id < "${id}"`;
      }

      sort = sort ? [`id desc`, ...sort] : 'id desc';

      return getFunction({
        sort,
        limit,
        where,
        filter,
        expand
      }).then((res) => {
        //res = filterBasedOnReviewCriteria(res);
        logger.info(`getAndFilterProductsBasedOnReviewCriteria, response: ${res}`)
        return recur(queryArgs, res, results.concat(res.results));
      });
    }

    return await recur(queryArgs);
  };
}

function filterBasedOnReviewCriteria(products) {
  // Filter products with the "product-review-summary" attribute and matching criteria
  const reviewSummaryAttribute = process.env.REVIEW_SUMMARY_ATTRIBUTE_NAME;
  const reviewCountDifference = process.env.REVIEW_COUNT_DIFFERENCE;

  let filteredProducts = products.filter((product) => {
    console.log("product:",JSON.parse(product))
    const hasReviewSummary = product.masterVariant.attributesRaw.some(
      (att) => att.name === reviewSummaryAttribute
    );

    if (hasReviewSummary) {
      const productReviewSummary = product.masterVariant.attributesRaw.find(
        (att) => att.name === reviewSummaryAttribute
      );

      return (
        product.reviewRatingStatistics.count > productReviewSummary.referencedResource.value.totalReviewCount + reviewCountDifference ||
        parseFloatToFixedTwo(product.reviewRatingStatistics.averageRating) !== parseFloatToFixedTwo(productReviewSummary.referencedResource.value.lastAveragePoint)
      );
    }

    return product;
  });

  // If no products with "product-review-summary" attribute, include all products
  if (filteredProducts.length === 0) {
    filteredProducts = products;
  }
  return filteredProducts;
}

export { getAll, getAndFilterProductsBasedOnReviewCriteria };
