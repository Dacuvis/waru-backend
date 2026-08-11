import { MongoClient } from "mongodb";

const mongoUrl = Bun.env.MONGO_URL;

if(!mongoUrl) {
    throw new Error("MONGO_URL is not defined");
}

const client = new MongoClient(mongoUrl);

try {
    await client.connect();
} catch (error) {
    throw new Error("Failed to connect to MongoDB: " + error);
}

export const db = client.db("WARU");
