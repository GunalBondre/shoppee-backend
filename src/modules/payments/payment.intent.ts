// src/modules/payments/payment.intent.ts
import Stripe from "stripe";
import { pool } from "../../db";
import { ApiError } from "../../utils/apiErrors";
import { Request, Response } from "express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export const createPaymentIntent = async (req: Request, res: Response) => {
  const userId = await (req as any).user.id;
  const { orderId } = req.body;

  const result = await pool.query(
    `
    SELECT total_amount, status
    FROM orders
    WHERE id = $1 AND user_id = $2
    `,
    [orderId, userId]
  );

  if (!result.rowCount) {
    throw new ApiError(404, "Order not found");
  }

  const order = result.rows[0];

  if (order.status !== "CREATED") {
    throw new ApiError(409, "Order not payable");
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(order.total_amount * 100), // cents/paise
    currency: "inr",
    metadata: {
      orderId,
    },
  });

  res.json({
    clientSecret: intent.client_secret,
  });
};
