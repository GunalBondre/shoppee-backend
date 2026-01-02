// src/modules/orders/order.routes.ts
import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createOrderSchema } from "./order.schema";
import {
  getOrdersForLoggedInUser,
  createOrder,
  updateOrderStatus,
} from "./order.service";
import { OrderStatus } from "./orders.constants";

const router = Router();

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       201:
 *         description: Order created successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/orders",
  requireAuth,
  validate(createOrderSchema),
  async (req, res) => {
    const userId = (req as any).user.id;
    const { items } = req.body;

    const order = await createOrder(userId, items);
    res.status(201).json(order);
  }
);

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get all orders for logged-in user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   user_id:
 *                     type: string
 *                     format: uuid
 *                   status:
 *                     type: string
 *                     enum: [pending, processing, shipped, delivered, cancelled]
 *                   total_amount:
 *                     type: number
 *                     format: decimal
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/orders", requireAuth, async (req, res) => {
  const userId = (req as any).user.id;
  const orders = await getOrdersForLoggedInUser(userId);
  res.json(orders);
});

/**
 * @swagger
 * /orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order
 *     description: >
 *       Cancels an order if it is still in a cancellable state
 *       (CREATED or PAID). Orders that are already SHIPPED or
 *       DELIVERED cannot be cancelled.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID to cancel
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Order cancelled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order cannot be cancelled in its current state
 */

router.post("/orders/:id/cancel", requireAuth, async (req, res) => {
  const userId = (req as any).user.id;
  const orderId = req.params.id;

  await updateOrderStatus(userId, orderId, OrderStatus.CANCELLED);

  res.json({ message: "Order cancelled" });
});

export default router;
