import { Request, Response } from 'express';
import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';
import { getReviewCriteriaFilteredProducts } from '../productProjections/fetch.productProjections';
import { formatProductIds, mapProducts } from '../productProjections/map.productProjections';
import { allReviews } from '../reviews/fetch.reviews';
import { mapReviews } from '../reviews/map.reviews';

/**
 * Exposed job endpoint.
 *
 * @param {Request} _request The express request
 * @param {Response} response The express response
 * @returns
 */
export const post = async (_request: Request, response: Response) => {
  try {
    // Search Product Projections - returns all products with reviews and filters based on review criteria
    const productProjections = await getReviewCriteriaFilteredProducts({
      filter: 'reviewRatingStatistics.count: range(1 to *)',
      expand: 'masterVariant.attributes[*].value'
    })
    logger.info(`Product projections search result: ${productProjections}`)
    
    // 
    if(productProjections.results.length == 0)
      return response.status(200).send("No new update on product reviews.")

    // Map Filtered Product Projections based on Review Criteria
    const mappedProducts = mapProducts(productProjections.results);

    // Fetch reviews of products
    const productReviews = await allReviews({
      where: mappedProducts.length > 0 ? `target(typeId="product" and id in (${formatProductIds(mappedProducts)}))` : 'target(typeId="product")'
    })
    // Map reviews
    const productsWithReviews = mappedProducts.map(product => ({
      ...product,
      reviews: mapReviews(productReviews.results.filter((review:any) => review.target.id === product.id))
    }));

    response.status(200).send(productsWithReviews);
    
    // // Get the orders
    // const limitedOrdersObject = await allOrders({ sort: ['lastModifiedAt'] });
    // logger.info(`There are ${limitedOrdersObject.total} orders!`);
    // response.status(200).send();
  } catch (error) {
    throw new CustomError(
      500,
      `Internal Server Error - Error retrieving all product projections or/and reviews from the commercetools SDK`
    );
  }
};

/**
 * Exposed job endpoint.
 *
 * @param {Response} response The express response
 * @returns
 */
export const get = async (response: Response) => {
  logger.info(`get`)

  try {
    // Search Product Projections - returns all products with reviews and filters based on review criteria
    const productProjections = await getReviewCriteriaFilteredProducts({
      filter: 'reviewRatingStatistics.count: range(1 to *)',
      expand: 'masterVariant.attributes[*].value'
    })
    logger.info(`Product projections search result: ${productProjections}`)

    // 
    if(productProjections.results.length == 0)
      return response.status(200).send("No new update on product reviews.")

    // Map Filtered Product Projections based on Review Criteria
    const mappedProducts = mapProducts(productProjections.results);

    // Fetch reviews of products
    const productReviews = await allReviews({
      where: mappedProducts.length > 0 ? `target(typeId="product" and id in (${formatProductIds(mappedProducts)}))` : 'target(typeId="product")'
    })

    // Map reviews
    const productsWithReviews = mappedProducts.map(product => ({
      ...product,
      reviews: mapReviews(productReviews.results.filter((review:any) => review.target.id === product.id))
    }));

    response.status(200).send(productsWithReviews);
    
    // // Get the orders
    // const limitedOrdersObject = await allOrders({ sort: ['lastModifiedAt'] });
    // logger.info(`There are ${limitedOrdersObject.total} orders!`);
    // response.status(200).send();
  } catch (error) {
    throw new CustomError(
      500,
      `Internal Server Error - Error retrieving all product projections or/and reviews from the commercetools SDK`
    );
  }
};
