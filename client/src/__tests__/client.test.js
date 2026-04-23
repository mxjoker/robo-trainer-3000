import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../offline/queue', () => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  flushQueue: vi.fn().mockResolvedValue(undefined),
}))

import { enqueue } from '../offline/queue'
import { api } from '../api/client'

function makeFetchResponse({ status = 200, body = null, ok = true }) {
  return {
    ok,
    status,
    statusText: 'Error',
    json: () => Promise.resolve(body),
  }
}

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('successful GET returns parsed JSON', async () => {
    const data = { id: 1, name: 'Test' }
    fetch.mockResolvedValueOnce(makeFetchResponse({ status: 200, body: data }))

    const result = await api.get('/workouts')

    expect(fetch).toHaveBeenCalledWith('/api/workouts', expect.any(Object))
    const callHeaders = fetch.mock.calls[0][1].headers
    expect(callHeaders).not.toHaveProperty('Content-Type')
    expect(result).toEqual(data)
  })

  it('failed request throws error with .status property', async () => {
    fetch.mockResolvedValueOnce(makeFetchResponse({
      ok: false,
      status: 401,
      body: { error: 'Unauthorized' }
    }))

    await expect(api.get('/protected')).rejects.toMatchObject({
      message: 'Unauthorized',
      status: 401
    })
  })

  it('204 response returns null', async () => {
    fetch.mockResolvedValueOnce(makeFetchResponse({ status: 204, ok: true, body: null }))

    const result = await api.delete('/workouts/1')
    expect(result).toBeNull()
  })

  it('includes Authorization header when token is in localStorage', async () => {
    localStorage.setItem('rt_token', 'my-test-token')
    const data = { id: 2 }
    fetch.mockResolvedValueOnce(makeFetchResponse({ status: 200, body: data }))

    await api.get('/me')

    expect(fetch).toHaveBeenCalledWith('/api/me', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer my-test-token'
      })
    }))
  })

  it('does not include Authorization header when no token', async () => {
    const data = { id: 3 }
    fetch.mockResolvedValueOnce(makeFetchResponse({ status: 200, body: data }))

    await api.get('/public')

    const callHeaders = fetch.mock.calls[0][1].headers
    expect(callHeaders).not.toHaveProperty('Authorization')
  })

  it('enqueues POST requests and returns { _queued: true } when offline and fetch throws', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    fetch.mockRejectedValueOnce(new Error('Network error'))
    enqueue.mockResolvedValueOnce(undefined)

    const result = await api.post('/workouts', { name: 'Run' })

    expect(result).toEqual({ _queued: true })
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
      path: '/workouts',
      method: 'POST',
    }))

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
  })

  it('rethrows error normally when online and fetch throws', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
    fetch.mockRejectedValueOnce(new Error('Server error'))

    await expect(api.post('/workouts', { name: 'Run' })).rejects.toThrow('Server error')
  })
})
