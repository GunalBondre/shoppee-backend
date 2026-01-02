import { Request, Response } from "express";
import Stripe from "stripe";
import { randomUUID } from "crypto";
import { pool } from "../../db";
import { OrderStatus } from "../orders/orders.constants";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

/**
 * Process payment success - update order status and create payment record
 */
const handlePaymentSuccess = async (paymentIntent: Stripe.PaymentIntent) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Extract order ID from metadata (should be set when creating payment intent)
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId) {
      console.error(
        "Payment intent missing orderId in metadata:",
        paymentIntent.id
      );
      throw new Error("Order ID not found in payment metadata");
    }

    // Check if payment already processed (idempotency)
    const existingPayment = await client.query(
      `SELECT id FROM payments WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    if (existingPayment.rowCount && existingPayment.rowCount > 0) {
      console.log(`Payment ${paymentIntent.id} already processed, skipping`);
      await client.query("COMMIT");
      return;
    }

    // Verify order exists and is in CREATED status
    const orderResult = await client.query(
      `SELECT id, user_id, total_amount, status FROM orders WHERE id = $1`,
      [orderId]
    );

    if (!orderResult.rowCount) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderResult.rows[0];

    if (order.status !== OrderStatus.CREATED) {
      console.warn(
        `Order ${orderId} is in ${order.status} status, cannot be paid`
      );
      await client.query("COMMIT");
      return;
    }

    // Create payment record
    const paymentId = randomUUID();
    await client.query(
      `
      INSERT INTO payments (
        id, order_id, user_id, 
        stripe_payment_intent_id, amount, 
        currency, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `,
      [
        paymentId,
        orderId,
        order.user_id,
        paymentIntent.id,
        paymentIntent.amount, // Amount in cents
        paymentIntent.currency,
        "succeeded",
      ]
    );

    // Update order status to PAID
    await client.query(`UPDATE orders SET status = $1 WHERE id = $2`, [
      OrderStatus.PAID,
      orderId,
    ]);

    await client.query("COMMIT");
    console.log(
      `✅ Payment succeeded for order ${orderId}, payment intent: ${paymentIntent.id}`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error processing payment success:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Process payment failure - log and potentially notify user
 */
const handlePaymentFailure = async (paymentIntent: Stripe.PaymentIntent) => {
  try {
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId) {
      console.error(
        "Payment intent missing orderId in metadata:",
        paymentIntent.id
      );
      return;
    }

    // Create payment record with failed status
    const paymentId = randomUUID();
    await pool.query(
      `
      INSERT INTO payments (
        id, order_id, 
        stripe_payment_intent_id, amount, 
        currency, status, failure_reason, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (stripe_payment_intent_id) DO NOTHING
      `,
      [
        paymentId,
        orderId,
        paymentIntent.id,
        paymentIntent.amount,
        paymentIntent.currency,
        "failed",
        paymentIntent.last_payment_error?.message || "Payment failed",
      ]
    );

    // Order remains in CREATED status (can retry payment)
    console.log(
      `❌ Payment failed for order ${orderId}, payment intent: ${paymentIntent.id}`
    );
    console.log(`Failure reason: ${paymentIntent.last_payment_error?.message}`);

    // TODO: Send notification to user about payment failure
    // TODO: Potentially cancel order after X failed attempts
  } catch (error) {
    console.error("❌ Error processing payment failure:", error);
    // Don't throw - we want to acknowledge webhook even if logging fails
  }
};

/**
 * Handle Stripe webhook events
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("Missing stripe-signature header");
    return res.status(400).json({ error: "Missing signature" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle different event types
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntentSucceeded = event.data
          .object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntentSucceeded);
        break;

      case "payment_intent.payment_failed":
        const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(paymentIntentFailed);
        break;

      case "payment_intent.canceled":
        const paymentIntentCanceled = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment intent canceled: ${paymentIntentCanceled.id}`);
        // Handle cancellation if needed
        break;

      case "charge.refunded":
        const charge = event.data.object as Stripe.Charge;
        console.log(`Charge refunded: ${charge.id}`);
        // TODO: Handle refund - update order status, create refund record
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt of webhook
    res.json({ received: true });
  } catch (error: any) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    // Still acknowledge to prevent Stripe from retrying
    // But log the error for manual investigation
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

/**
 * Create a Stripe payment intent for an order
 */
export const createPaymentIntent = async (
  orderId: string,
  amount: number, // Amount in cents
  currency: string = "usd"
): Promise<Stripe.PaymentIntent> => {
  try {
    // Verify order exists
    const orderResult = await pool.query(
      `SELECT id, user_id, total_amount, status FROM orders WHERE id = $1`,
      [orderId]
    );

    if (!orderResult.rowCount) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderResult.rows[0];

    if (order.status !== OrderStatus.CREATED) {
      throw new Error(`Order ${orderId} is not in CREATED status`);
    }

    // Create payment intent with order metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: currency,
      metadata: {
        orderId: orderId,
        userId: order.user_id,
      },
      // Optional: Add automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment intent ID in database for reference
    await pool.query(
      `
      INSERT INTO payments (
        id, order_id, user_id,
        stripe_payment_intent_id, amount,
        currency, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (stripe_payment_intent_id) DO NOTHING
      `,
      [
        randomUUID(),
        orderId,
        order.user_id,
        paymentIntent.id,
        amount,
        currency,
        "pending",
      ]
    );

    return paymentIntent;
  } catch (error) {
    console.error("❌ Error creating payment intent:", error);
    throw error;
  }
};
