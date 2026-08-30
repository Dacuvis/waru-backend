import { MongoClient } from "mongodb";

const mongoUrl = Bun.env.MONGO_URL ?? Bun.env.MONGODB_URI ?? Bun.env.MONGO_URI;

if (!mongoUrl) {
  throw new Error("Mongo connection URL is not defined. Set MONGO_URL or MONGODB_URI in Railway env.");
}

const client = new MongoClient(mongoUrl, {
  serverSelectionTimeoutMS: 10000,
  tlsAllowInvalidCertificates: true,
});

try {
  await client.connect();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Failed to connect to MongoDB: ${message}`);
}

export const db = client.db(Bun.env.MONGO_DB_NAME || "WARU");
