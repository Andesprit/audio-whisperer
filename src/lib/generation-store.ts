import { openDB, type DBSchema } from "idb";
import type { PersistedGeneration } from "../types/documents";

interface AudioWhispererDb extends DBSchema {
  generations: {
    key: string;
    value: PersistedGeneration;
  };
}

const ACTIVE_GENERATION = "active";

function database() {
  return openDB<AudioWhispererDb>("audio-whisperer", 1, {
    upgrade(db) {
      db.createObjectStore("generations");
    },
  });
}

export async function saveGeneration(generation: PersistedGeneration): Promise<void> {
  const db = await database();
  await db.put("generations", generation, ACTIVE_GENERATION);
}

export async function loadGeneration(): Promise<PersistedGeneration | undefined> {
  const db = await database();
  return db.get("generations", ACTIVE_GENERATION);
}

export async function clearGeneration(): Promise<void> {
  const db = await database();
  await db.delete("generations", ACTIVE_GENERATION);
}
