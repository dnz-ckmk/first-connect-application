import { Review } from "@commercetools/platform-sdk";

export const mapReviews = (reviews: Review[]): any[] => {
    return reviews.map(review => ({
      title: review.title,
      review: review.text,
      score: review.rating
    }));
  }