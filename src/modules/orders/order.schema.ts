// src/modules/orders/order.schema.ts
import { z } from "zod";

export const createOrderSchema = {
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      )
      .min(1),
  }),
};
