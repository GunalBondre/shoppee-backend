import { randomUUID } from "crypto";
import { pool } from "../../db";
import { ApiError } from "../../utils/apiErrors";
import { OrderStatus } from "./orders.constants";
import { allowedTransitions } from "./orders.transactions";

export const createOrder = async (
  userId: string,
  items: { productId: string; quantity: number }[]
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const productIds = items.map((i) => i.productId);
    const res = await client.query(
      `
      SELECT id, name, price,stock
      FROM products
      WHERE id = ANY($1::uuid[])
      FOR UPDATE
      `,
      [productIds]
    );

    if (!res.rowCount) {
      throw new ApiError(400, "Product not found");
    }

    if (res.rowCount !== items.length) {
      throw new ApiError(400, "Invalid product in order");
    }

    let totalAmount = 0;

    const orderItems = await Promise.all(
      res.rows.map(async (product) => {
        const item = items.find((i) => i.productId === product.id)!;

        if (product.stock < item.quantity) {
          throw new ApiError(409, "Insufficient stock");
        }

        await client.query(
          `UPDATE products SET stock = stock - $1 WHERE id = $2`,
          [item.quantity, product.id]
        );

        const lineTotal = product.price * item.quantity;

        return {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: item.quantity,
          lineTotal,
        };
      })
    );

    totalAmount = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

    const orderId = randomUUID();
    await client.query(
      `
      INSERT INTO orders (id, user_id, total_amount, status)
      VALUES ($1, $2, $3, 'CREATED')
      `,
      [orderId, userId, totalAmount]
    );

    for (const item of orderItems) {
      await client.query(
        `
        INSERT INTO order_items (
          id, order_id, product_id,
          product_name, unit_price,
          quantity, line_total
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          randomUUID(),
          orderId,
          item.productId,
          item.productName,
          item.unitPrice,
          item.quantity,
          item.lineTotal,
        ]
      );
    }
    await client.query("COMMIT");
    return { orderId, totalAmount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getOrdersForLoggedInUser = async (userId: string) => {
  const response = await pool.query(
    `
    SELECT
      o.id              AS order_id,
      o.total_amount,
      o.status,
      o.created_at,
      oi.id             AS item_id,
      oi.product_id,
      oi.product_name,
      oi.unit_price,
      oi.quantity,
      oi.line_total
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = $1
    ORDER BY o.created_at DESC
        `,
    [userId]
  );

  const ordersMap = new Map<string, any>();

  for (const row of response.rows) {
    if (!ordersMap.has(row.order_id)) {
      ordersMap.set(row.order_id, {
        id: row.order_id,
        totalAmount: row.total_amount,
        status: row.status,
        createdAt: row.created_at,
        items: [],
      });
    }
    ordersMap.get(row.order_id).items.push({
      id: row.item_id,
      productId: row.product_id,
      productName: row.product_name,
      unitPrice: row.unit_price,
      quantity: row.quantity,
      lineTotal: row.line_total,
    });
  }
  return Array.from(ordersMap.values());
};

export const updateOrderStatus = async (
  userId: string,
  orderId: string,
  nextStatus: OrderStatus
) => {
  const res = await pool.query(
    `SELECT status from orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId]
  );

  if (!res.rowCount) {
    throw new ApiError(404, "Order not found");
  }

  const currentStatus = res.rows[0].status as OrderStatus;

  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw new ApiError(
      409,
      `Cannot change order from ${currentStatus} to ${nextStatus}`
    );
  }

  await pool.query(`Update orders SET status = $1 where id = $2`, [
    nextStatus,
    orderId,
  ]);
};
