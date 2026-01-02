// src/modules/payments/payment.webhook.ts
import Stripe from "stripe";
import { pool } from "../../db";
import { randomUUID } from "crypto";
import { Request, Response } from "express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return res.status(400).send("Invalid signature");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata.orderId;

      // Idempotency gate
      try {
        await client.query(
          `
          INSERT INTO payments (
            id, order_id, provider, provider_payment_id, status
          )
          VALUES ($1, $2, 'stripe', $3, 'SUCCESS')
          `,
          [randomUUID(), orderId, intent.id]
        );
      } catch {
        await client.query("ROLLBACK");
        return res.sendStatus(200); // already processed
      }

      await client.query(`UPDATE orders SET status = 'PAID' WHERE id = $1`, [
        orderId,
      ]);
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata.orderId;

      try {
        await client.query(
          `
          INSERT INTO payments (
            id, order_id, provider, provider_payment_id, status
          )
          VALUES ($1, $2, 'stripe', $3, 'FAILED')
          `,
          [randomUUID(), orderId, intent.id]
        );
      } catch {
        await client.query("ROLLBACK");
        return res.sendStatus(200);
      }

      await client.query(
        `UPDATE orders SET status = 'CANCELLED' WHERE id = $1`,
        [orderId]
      );

      // Restore inventory
      await client.query(
        `
        UPDATE products
        SET stock = stock + oi.quantity
        FROM order_items oi
        WHERE oi.order_id = $1
          AND products.id = oi.product_id
        `,
        [orderId]
      );
    }

    await client.query("COMMIT");
    res.sendStatus(200);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
