import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, Prisma } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// 1. Get the actual folder where this specific index.ts file lives
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Point directly to the .env file relative to this module
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
  override: true
});

const connectionString = `${process.env.DATABASE_URL}`;
console.log(connectionString)
// Create an instance of the Prisma Postgres adapter
const adapter = new PrismaPg({ connectionString });

// Pass the adapter to the PrismaClient constructor
const prisma = new PrismaClient({ adapter });

export { prisma, Prisma };