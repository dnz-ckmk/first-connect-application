import { createApiRoot } from '../client/create.client';
import CustomError from '../errors/custom.error';
import { Resource } from '../interfaces/resource.interface';
import { CreateOrUpdateCustomObject, ProductProjectionSearch, Reviews } from '../queries/GraphqlQueries';
import { Product, ProductUpdateAction, Review } from '@commercetools/platform-sdk';
import { sendReviewsToGPT } from './openai.controller';

const reviewSummaryAttribute = "product-review-summary";

const executeGqlQuery = async (query: any, variables: any) => {
  return createApiRoot().graphql().post({
    body: {
      query: query.loc?.source.body.toString(),
      variables
    },
    headers: {
      'Content-Type': 'application/json'
    }
  }).execute();
}

//#region Get Reviews
const productProjectionsSearchGql = async (limit = 500, offset = 0): Promise<any> => {
  const variables = {
    limit,
    offset,
    filters: [{
      model: {
        range: {
          path: "reviewRatingStatistics.count",
          ranges: [{ from: "1", to: "*" }],
        }
      }
    }],
    includeNames: reviewSummaryAttribute
  };

  return await executeGqlQuery(ProductProjectionSearch, variables);
}

const parseFloatToFixedTwo = (number: number): any => {
  return parseFloat(number.toFixed(2));
}

const productProjectionsWithReviewCriteria = (products: Product[], reviewCountDifference: number): Product[] => {
  // Filter products with the "product-review-summary" attribute and matching criteria
  let filteredProducts = products.filter((product: any) => {
    const hasReviewSummary = product.masterVariant.attributesRaw.some(
      (att: any) => att.name === reviewSummaryAttribute
    );

    if (hasReviewSummary) {
      const productReviewSummary = product.masterVariant.attributesRaw.find(
        (att: any) => att.name === reviewSummaryAttribute
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

const mapProducts = (products: Product[]): any[] => {
  return products.map(product => ({ id: product.id, version: product.version, reviewRatingStatistics: product.reviewRatingStatistics }))
}

const fetchProductProjectionsSearchPaginationGql = async (reviewCountDifference: number, limit = 500): Promise<any[]> => {
  let offset = 0;
  let allProducts: any[] = [];
  let hasMore = true;

  while (hasMore) {
    const response = await productProjectionsSearchGql(limit, offset);
    const results: Product[] = response.body.data.productProjectionSearch.results;

    const filteredProducts = productProjectionsWithReviewCriteria(results, reviewCountDifference);

    const products = mapProducts(filteredProducts);
    allProducts = [...allProducts, ...products];

    hasMore = results.length === limit;
    offset += limit;
  }

  return allProducts;
}

const formatProductIdsForGql = (products: Product[]): string => {
  return products.map(product => `\"${product.id}\"`).join(', ');
}

const fetchProductReviewsGql = async (products: Product[], sort: string[] = [], limit = 500, offset = 0): Promise<any> => {
  const variables = {
    sort,
    limit,
    offset,
    where: products.length > 0 ? `target(typeId="product" and id in (${formatProductIdsForGql(products)}))` : 'target(typeId="product")'
  };

  return await executeGqlQuery(Reviews, variables);
}

const mapReviews = (reviews: Review[]): any[] => {
  return reviews.map(review => ({
    title: review.title,
    review: review.text,
    score: review.rating
  }));
}

const fetchProductReviewsPaginationGql = async (products: Product[], sort: string[] = []): Promise<any[]> => {
  const limit = 500;
  let allReviews: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const reviewResponse = await fetchProductReviewsGql(products, sort, limit, offset);
    const results: Review[] = reviewResponse.body.data.reviews.results;

    allReviews = [...allReviews, ...results];
    hasMore = results.length === limit;
    offset += limit;
  }

  return allReviews;
}

const estimateSizeInKB = <T>(param: T): number => {
  const jsonString = JSON.stringify(param);
  const bytes = new TextEncoder().encode(jsonString).length;
  return bytes / 1024;
}

const paginateBasedOnSize = (data: any[], pageSize: number): any[] => {
  const result = [];
  let currentPage: any = [];

  data.forEach((item, i) => {
    currentPage.push(item);
    if (estimateSizeInKB(currentPage) > pageSize) {
      currentPage.pop();
      result.push(currentPage);
      currentPage = [item];
    }
  });

  if (currentPage.length)
    result.push(currentPage);
  return result;
}

/**
 * Handle the get products with reviews action
 *
 * @param reviewCountDifference 
 * @param pageSize 
 * @returns {object}
 */
const productProjectionsWithReviews = async (reviewCountDifference: number, pageSize: number)/*: Promise<object>*/ => {
  try {
    const allProducts = await fetchProductProjectionsSearchPaginationGql(reviewCountDifference);
    const allReviews = await fetchProductReviewsPaginationGql(allProducts);

    let productsWithReviews = allProducts.map(product => ({
      ...product,
      reviews: mapReviews(allReviews
        .filter(review => review.target.id === product.id))
    }));

    const sizeInKB = estimateSizeInKB(productsWithReviews);
    if (sizeInKB > pageSize) {
      productsWithReviews = paginateBasedOnSize(productsWithReviews, pageSize);
    }

    return { statusCode: 200, actions:null, body: productsWithReviews };
  } catch (error) {
    // Retry or handle the error
    // Create an error object
    if (error instanceof Error) {
      throw new CustomError(
        400,
        `Internal server error on CartController: ${error.stack}`
      );
    }
  }
}

//#endregion


//#region Process Reviews

const createOrUpdateProductReviewSummaryObject = async (
  product: Product | any,
  summaryOfReview: any,
  isConfirmed: boolean,
  totalReviewCount: number,
  lastAveragePoint: number
): Promise<any> => {
  const valueObject = {
    productId: product.id,
    isConfirmed: isConfirmed,
    summaryOfReview: generateSummaryModel(summaryOfReview),
    totalReviewCount: totalReviewCount, // product.reviewRatingStatistics!.count,
    lastAveragePoint: lastAveragePoint  // product.reviewRatingStatistics!.averageRating
  };

  const variables = {
    draft: {
      container: reviewSummaryAttribute,
      key: product.id,
      value: JSON.stringify(valueObject)
    }
  };
  return await executeGqlQuery(CreateOrUpdateCustomObject, variables);
};

const generateSummaryModel = (summaryOfReview: any) => {
  summaryOfReview = JSON.parse(summaryOfReview);
  return {
    summary: {
      tr: summaryOfReview.summary.tr || null,
      en: summaryOfReview.summary.en || null,
      fr: summaryOfReview.summary.fr || null,
      de: summaryOfReview.summary.de || null,
      nl: summaryOfReview.summary.nl || null
    },
    commonPositive: {
      tr: summaryOfReview.commonPositive.tr || null,
      en: summaryOfReview.commonPositive.en || null,
      fr: summaryOfReview.commonPositive.fr || null,
      de: summaryOfReview.commonPositive.de || null,
      nl: summaryOfReview.commonPositive.nl || null
    },
    commonNegative: {
      tr: summaryOfReview.commonNegative.tr || null,
      en: summaryOfReview.commonNegative.en || null,
      fr: summaryOfReview.commonNegative.fr || null,
      de: summaryOfReview.commonNegative.de || null,
      nl: summaryOfReview.commonNegative.nl || null
    },
    noteableObservation: {
      tr: summaryOfReview.noteableObservation.tr || null,
      en: summaryOfReview.noteableObservation.en || null,
      fr: summaryOfReview.noteableObservation.fr || null,
      de: summaryOfReview.noteableObservation.de || null,
      nl: summaryOfReview.noteableObservation.nl || null
    }
  };
};

const updateProductReviewSummaryAttribute = async (customObjectId: string, product: Product | any) => {
  const updateAction: ProductUpdateAction = {
    action: 'setAttributeInAllVariants',
    name: reviewSummaryAttribute,
    value: {
      typeId: "key-value-document",
      id: customObjectId
    }
  }

  return await createApiRoot().products().withId({ ID: product.id }).post({
    body: {
      version: product.version,
      actions: [updateAction]
    }
  }).execute();
}

const calculateTotalReviewCount = (reviews: any[]): number => {
  return reviews.length;
};

const calculateAverageScore = (reviews: { title: string; review: string; score: number }[]): number => {
  const totalScore = reviews.reduce((sum, review) => sum + review.score, 0);
  const averageScore = totalScore / reviews.length;
  return parseFloat(averageScore.toFixed(2)); // Rounded to 2 decimal places
};

const processReviews = async (data: any) => {
  try {
    const reviews = data.reviews;
    const totalReviewCount = calculateTotalReviewCount(reviews);
    const averageScore = calculateAverageScore(reviews);

    if (!reviews) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Reviews are missing" }),
      };
    }

    const gptResponse = await sendReviewsToGPT(reviews);
    if (!gptResponse) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "No content in Chat-GPT response." + gptResponse }),
      };
    }

    const product = {
      id: data.id,
      version: data.version,
      reviewRatingStatistics: data.reviewRatingStatistics
    };

    const updateProductReviewSummaryResponse = await createOrUpdateProductReviewSummaryObject(product, gptResponse, false, totalReviewCount, averageScore);
    if (!updateProductReviewSummaryResponse || updateProductReviewSummaryResponse.statusCode !== 200) {
      return {
        statusCode: updateProductReviewSummaryResponse.statusCode,
        body: JSON.stringify(updateProductReviewSummaryResponse.body.errors)
      };
    }

    const setReviewSummaryAttributeResponse = await updateProductReviewSummaryAttribute(updateProductReviewSummaryResponse.body.data.createOrUpdateCustomObject.id, product)

    return {
      statusCode: 200,
      body: JSON.stringify(setReviewSummaryAttributeResponse),
    };

  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
}

//#endregion


// Controller for update actions
// const update = (resource: Resource) => {};

/**
 * Handle the cart controller according to the action
 *
 * @param {string} action The action that comes with the request. Could be `Create` or `Update`
 * @param {Resource} _resource The resource from the request body
 * @returns {Promise<object>} The data from the method that handles the action
 */
export const reviewsController = async (action: string, _resource: Resource) => {
  switch (action) {
    case 'GetReviews': {
      const reviewCountDifference = Number(process.env.REVIEW_COUNT_DIFFERENCE);
      const pageSizeKB = 256;
      const data = productProjectionsWithReviews(reviewCountDifference, pageSizeKB);
      return data;
    }
    case 'ProcessReviews': {
      const data = processReviews(_resource);
      return data;
    }

    default:
      throw new CustomError(
        500,
        `Internal Server Error - Resource not recognized. Allowed values are 'Create' or 'Update'.`
      );
  }
};
