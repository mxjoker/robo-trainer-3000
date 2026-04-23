import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    add: vi.fn().mockResolvedValue(1),
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  })
}))

import { openDB } from 'idb'
import { enqueue, dequeueAll, remove, flushQueue } from '../offline/queue'

describe('offline queue', () => {
  let fakeDb

  beforeEach(() => {
    fakeDb = {
      add: vi.fn().mockResolvedValue(1),
      getAll: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    }
    openDB.mockResolvedValue(fakeDb)
  })

  it('enqueue adds an item to the store with a timestamp', async () => {
    const before = Date.now()
    await enqueue({ path: '/workouts', body: { name: 'Run' }, method: 'POST' })
    const after = Date.now()

    expect(fakeDb.add).toHaveBeenCalledOnce()
    const [store, item] = fakeDb.add.mock.calls[0]
    expect(store).toBe('request-queue')
    expect(item.path).toBe('/workouts')
    expect(item.body).toEqual({ name: 'Run' })
    expect(item.method).toBe('POST')
    expect(item.timestamp).toBeGreaterThanOrEqual(before)
    expect(item.timestamp).toBeLessThanOrEqual(after)
  })

  it('dequeueAll returns items from the store', async () => {
    const items = [
      { id: 1, path: '/workouts', body: null, method: 'POST', timestamp: 1000 },
      { id: 2, path: '/sessions', body: { x: 1 }, method: 'PUT', timestamp: 2000 },
    ]
    fakeDb.getAll.mockResolvedValue(items)

    const result = await dequeueAll()

    expect(fakeDb.getAll).toHaveBeenCalledWith('request-queue')
    expect(result).toEqual(items)
  })

  it('remove calls db.delete with the id', async () => {
    await remove(42)

    expect(fakeDb.delete).toHaveBeenCalledWith('request-queue', 42)
  })

  it('flushQueue calls apiFn for each item and removes it on success', async () => {
    const items = [
      { id: 1, path: '/workouts', body: { name: 'Run' }, method: 'POST', timestamp: 1000 },
      { id: 2, path: '/sessions', body: null, method: 'DELETE', timestamp: 2000 },
    ]
    fakeDb.getAll.mockResolvedValue(items)

    const apiFn = vi.fn().mockResolvedValue({ id: 99 })

    await flushQueue(apiFn)

    expect(apiFn).toHaveBeenCalledTimes(2)
    expect(apiFn).toHaveBeenNthCalledWith(1, '/workouts', { name: 'Run' }, 'POST')
    expect(apiFn).toHaveBeenNthCalledWith(2, '/sessions', null, 'DELETE')
    expect(fakeDb.delete).toHaveBeenCalledWith('request-queue', 1)
    expect(fakeDb.delete).toHaveBeenCalledWith('request-queue', 2)
  })

  it('flushQueue leaves items in queue if apiFn throws', async () => {
    const items = [
      { id: 1, path: '/workouts', body: { name: 'Run' }, method: 'POST', timestamp: 1000 },
    ]
    fakeDb.getAll.mockResolvedValue(items)

    const apiFn = vi.fn().mockRejectedValue(new Error('Network error'))

    await flushQueue(apiFn)

    expect(apiFn).toHaveBeenCalledOnce()
    expect(fakeDb.delete).not.toHaveBeenCalled()
  })
})
