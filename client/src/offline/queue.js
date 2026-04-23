import { openDB } from 'idb'

const DB_NAME = 'robo-trainer-offline'
const STORE = 'request-queue'

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export async function enqueue(request) {
  const db = await getDb()
  await db.add(STORE, { ...request, timestamp: Date.now() })
}

export async function dequeueAll() {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function remove(id) {
  const db = await getDb()
  await db.delete(STORE, id)
}

export async function flushQueue(apiFn) {
  const items = await dequeueAll()
  for (const item of items) {
    try {
      await apiFn(item.path, item.body, item.method)
      await remove(item.id)
    } catch {
      // Leave in queue if still failing
    }
  }
}
