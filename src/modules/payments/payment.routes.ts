import { Request, Response, Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { createPaymentIntent } from "./payment.intent";

const router = Router();

/**
 * @swagger
 * /api/v1/payments/create-intent:
 *   post:
 *     summary: Create a Stripe payment intent for an order
 *     description: >
 *       Creates a Stripe Payment Intent for an existing order.
 *       The backend calculates the payable amount using the stored order total.
 *       Only orders in CREATED state can be paid.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the order to be paid
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *                   description: Stripe client secret used to complete payment
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order is not in a payable state
 */

router.post("/payments/create-intent", requireAuth, createPaymentIntent);

export default router;
