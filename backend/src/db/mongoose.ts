/**
 * db/mongoose.ts
 * Opens a connection to MongoDB Atlas and returns the connection.
 * Called once at server startup.
 */
import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectMongo(): Promise<void> {
  await mongoose.connect(env.mongodbUri);
  console.log('MongoDB connected');
}
