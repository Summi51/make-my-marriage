import mongoose from "mongoose";

import { readServerEnv } from "./env-validation";

type CachedConnection = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalConnection = globalThis as typeof globalThis & {
  mongooseConnection?: CachedConnection;
};

const cached: CachedConnection = (globalConnection.mongooseConnection ??= {
  connection: null,
  promise: null,
});

export async function connectToDatabase() {
  if (cached.connection) {
    return cached.connection;
  }

  cached.promise ??= mongoose.connect(readServerEnv().MONGODB_URI, {
    bufferCommands: false,
  });

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
