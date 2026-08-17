import { swagger } from "@elysiajs/swagger";

export const swaggerConfig = swagger({
  documentation: {
    info: {
      title: "Waru Backend API",
      version: "1.0.0",
      description: "Backend API untuk aplikasi Waru - sistem manajemen restoran",
      contact: {
        name: "Waru Team",
        email: "rayyanbedadimensi@gmail.com"
      }
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server"
      }
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication endpoints (public)"
      },
      {
        name: "Users",
        description: "User management endpoints (🔒 butuh JWT token)"
      }
    ],
    // Wajibkan Bearer token secara global untuk semua endpoint
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "User ID"
            },
            name: {
              type: "string",
              description: "User name"
            },
            email: {
              type: "string",
              format: "email",
              description: "User email"
            }
          },
          required: ["id", "name", "email"]
        },
        RegisterRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "User name"
            },
            email: {
              type: "string",
              format: "email", 
              description: "User email"
            },
            password: {
              type: "string",
              minLength: 6,
              description: "User password"
            }
          },
          required: ["name", "email", "password"]
        },
        LoginRequest: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email"
            },
            password: {
              type: "string",
              description: "User password"
            }
          },
          required: ["email", "password"]
        },
        AuthResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Response message"
            },
            token: {
              type: "string",
              description: "JWT token"
            },
            user: {
              $ref: "#/components/schemas/User"
            }
          },
          required: ["message", "token", "user"]
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message"
            }
          },
          required: ["message"]
        }
      }
    }
  },
  path: "/docs"
});