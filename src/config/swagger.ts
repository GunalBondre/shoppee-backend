import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Shoppee E-commerce Backend API",
      version: "1.0.0",
      description: "Production-ready Node.js e-commerce backend API with authentication, user management, orders, products, and payments",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://api.shoppee.com",
        description: "Production server",
      },
    ],
    tags: [
      {
        name: "Health",
        description: "Health check endpoints",
      },
      {
        name: "Authentication",
        description: "User authentication and authorization",
      },
      {
        name: "Users",
        description: "User management operations",
      },
      {
        name: "Admin",
        description: "Admin-only operations",
      },
      {
        name: "Orders",
        description: "Order management",
      },
      {
        name: "Products",
        description: "Product management",
      },
      {
        name: "Payments",
        description: "Payment processing",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token obtained from login endpoint",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
            },
          },
        },
      },
    },
  },
  apis: [
    "src/modules/**/*.routes.ts",
    "src/app.ts",
  ],
});
