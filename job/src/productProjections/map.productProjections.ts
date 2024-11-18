// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
export const mapProducts = (products): any[] => {
    return products.map(product => ({ id: product.id, version: product.version, reviewRatingStatistics: product.reviewRatingStatistics }))
  }

export  const formatProductIds = (products): string => {
    return products.map(product => `\\"${product.id}\\"`).join(', ');
  }