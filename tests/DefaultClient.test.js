import {jest} from '@jest/globals'
import {WebSocket, Server} from "mock-socket";
import DefaultClient from "../src/DefaultClient";

describe('Default Client', () => {
  test('Constructs and connects as Host', async () => {
    const DOMAIN = 'wss://fakesite.com/app/'
    const mockServer = new Server(DOMAIN)
    const client = new DefaultClient()
    client._getConnectURL = jest.fn(() => DOMAIN)
    client._composeSocket = jest.fn(client._composeSocket)

    await client.init()

    expect(client._getConnectURL.mock.calls.length).toBe(1)
    expect(client._getConnectURL.mock.calls[0][0]).toBe(undefined)
    expect(client._composeSocket.mock.calls.length).toBe(1)
    expect(client._composeSocket.mock.calls[0][0]).toBe(undefined)
    expect(client._composeSocket.mock.calls[0][1]).toBe(DOMAIN)

  })
})