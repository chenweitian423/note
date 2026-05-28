import { createMemoryDb } from "../lib/db";

export async function createTestDb() {
  return createMemoryDb();
}
