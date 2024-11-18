import { Request, Response } from 'express';
import { apiSuccess } from '../api/success.api';
import CustomError from '../errors/custom.error';
import { cartController } from './cart.controller';
import { reviewsController } from './reviews.controller';

/**
 * Exposed service endpoint.
 * - Receives a POST request, parses the action and the controller
 * and returns it to the correct controller. We should be use 3. `Cart`, `Order` and `Payments`
 *
 * @param {Request} request The express request
 * @param {Response} response The express response
 * @returns
 */
export const post = async (request: Request, response: Response) => {
  // Deserialize the action and resource from the body
  const { action, resource } = request.body;

  if (!action || !resource) {
    throw new CustomError(400, 'Bad request - Missing body parameters.');
  }

  // Identify the type of resource in order to redirect
  // to the correct controller
  switch (resource.typeId) {
    case 'reviews':
      try {
        const data = await reviewsController(action, resource);

        if (data && data.statusCode === 200) {
          apiSuccess(200, data.body, response);
          return;
        }

        throw new CustomError(
          data ? data.statusCode : 400,
          JSON.stringify(data)
        );
      } catch (error) {
        if (error instanceof Error) {
          throw new CustomError(500, error.message);
        }
      }

      break;

    case 'cart':
      try {
        const data = await cartController(action, resource);

        if (data && data.statusCode === 200) {
          apiSuccess(200, data.actions, response);
          return;
        }

        throw new CustomError(
          data ? data.statusCode : 400,
          JSON.stringify(data)
        );
      } catch (error) {
        if (error instanceof Error) {
          throw new CustomError(500, error.message);
        }
      }

      break;

    case 'payment':
      break;

    case 'order':
      break;

    default:
      throw new CustomError(
        500,
        `Internal Server Error - Resource not recognized. Allowed values are 'reviews', 'cart', 'payments' or 'orders'.`
      );
  }
};

/**
 * Exposed service endpoint.
 * - Receives a GET request, parses the action and the controller
 * and returns it to the correct controller. Handles `Cart`, `Order`, and `Payments`
 *
 * @param {Request} request The express request
 * @param {Response} response The express response
 * @returns
 */
export const get = async (request: Request, response: Response) => {
  // Deserialize the action and resource from the query parameters
  const { action, resourceTypeId } = request.query;

  if (!action || !resourceTypeId) {
    throw new CustomError(400, 'Bad request - Missing query parameters.');
  }

  // Identify the type of resource to redirect
  switch (resourceTypeId) {

    case 'cart':
      try {
        const data = await cartController(action, { typeId: resourceTypeId });

        if (data && data.statusCode === 200) {
          apiSuccess(200, data.actions, response);
          return;
        }

        throw new CustomError(
          data ? data.statusCode : 400,
          JSON.stringify(data)
        );
      } catch (error) {
        if (error instanceof Error) {
          throw new CustomError(500, error.message);
        }
      }

      break;

    case 'payment':
      break;

    case 'order':
      break;

    default:
      throw new CustomError(
        500,
        `Internal Server Error - Resource not recognized. Allowed values are 'reviews', 'cart', 'payments', or 'orders'.`
      );
  }
};