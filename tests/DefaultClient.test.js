import {jest} from '@jest/globals'
import {WebSocket, Server} from "mock-socket";
import DefaultClient from "../src/DefaultClient";
import {HeartbeatSocket, SimpleObservable} from "../index";
import {HeartbeatConnectionError} from "../src/HeartbeatSocket";
import Types from "../src/Events/Types";

async function pause(durationMS) {
  return new Promise(r => setTimeout(r, durationMS))
}

describe('Default Client', () => {

  test('Constructs and connects as Opponent', async () => {
    const DOMAIN = 'wss://fakesite.com/app/'
    const mockServer = new Server(DOMAIN)
    const client = new DefaultClient()
    client._getConnectURL = jest.fn(() => DOMAIN)
    client._configureSocket = jest.fn(client._configureSocket)

    await client.init('test')

    expect(client._getConnectURL.mock.calls.length).toBe(1)
    expect(client._getConnectURL.mock.calls[0][0]).toBe('test')
    expect(client._configureSocket.mock.calls.length).toBe(1)
    expect(client._configureSocket.mock.calls[0][0]).toBe('test')
    expect(client._configureSocket.mock.calls[0][1]).toBe(DOMAIN)

    await client.close()
    mockServer.close()
  })

  test('Constructs and connects as Host', async () => {
    const DOMAIN = 'wss://fakesite.com/app/'
    const mockServer = new Server(DOMAIN)
    const client = new DefaultClient()
    client._getConnectURL = jest.fn(() => DOMAIN)
    client._configureSocket = jest.fn(client._configureSocket)

    // passing nothing to init will
    await client.init()

    expect(client._getConnectURL.mock.calls.length).toBe(1)
    expect(client._getConnectURL.mock.calls[0][0]).toBe(undefined)
    expect(client._configureSocket.mock.calls.length).toBe(1)
    expect(client._configureSocket.mock.calls[0][0]).toBe(undefined)
    expect(client._configureSocket.mock.calls[0][1]).toBe(DOMAIN)

    await client.close()
    mockServer.close()
  })

  test('Can reconnect', async () => {
    const STARTING_DELAY = 1000 // this value copied from DefaultClient.js

    // building a mocked HeartbeatSocket
    const mockedHeartbeatSocket = new SimpleObservable()
    mockedHeartbeatSocket.close = jest.fn(() => mockedHeartbeatSocket.trigger(HeartbeatSocket.EVENT_CONNECTION_CLOSED))
    mockedHeartbeatSocket.waitForConnection = jest.fn(() => pause(100))
    mockedHeartbeatSocket.send = jest.fn()

    const code = '123456'
    const client = new DefaultClient()
    client._getConnectURL = jest.fn(() => 'https://example.com')
    client._composeSocket = jest.fn(() => mockedHeartbeatSocket)
    client.__beginAttemptReconnect = jest.fn(client.__beginAttemptReconnect)
    client.trigger = jest.fn(client.trigger)

    await client.init(code)
    expect(client._composeSocket.mock.calls.length).toBe(1)
    expect(client.hasPulse()).toBe(false)

    mockedHeartbeatSocket.trigger(HeartbeatSocket.EVENT_CONNECTION_ERROR, new Error())

    await pause(50)

    // should not have started reconnect attempts
    expect(client.__reconnectDelay).toBe(STARTING_DELAY)
    expect(client.__reconnectTimeout).toBeFalsy()
    expect(mockedHeartbeatSocket.close.mock.calls.length).toBe(0)

    // ------------------------------------------------------------------
    // slipping in a quick test of the handleDataMessage invocation for sanity
    client.__handleDataMessage = jest.fn(client.__handleDataMessage)
    const data = {foo: 'bar'}
    mockedHeartbeatSocket.trigger(HeartbeatSocket.EVENT_MESSAGE_RECEIVED, data)
    expect(client.__handleDataMessage.mock.calls.length).toBe(1)
    expect(client.__handleDataMessage.mock.calls[0][0]).toBe(data)
    // ------------------------------------------------------------------

    expect(client.hasPulse()).toBe(true)

    mockedHeartbeatSocket.trigger(HeartbeatSocket.EVENT_CONNECTION_ERROR, new HeartbeatConnectionError())
    await pause(50)
    // should* have started reconnect attempts
    expect(client.__reconnectDelay).toBe(STARTING_DELAY * 2)
    expect(client.__reconnectTimeout).toBeTruthy()
    expect(mockedHeartbeatSocket.close.mock.calls.length).toBe(1)
    expect(client.__beginAttemptReconnect.mock.calls.length).toBe(0)

    // should have triggered a connection lost event
    expect(client.trigger.mock.calls[client.trigger.mock.calls.length -1][0]).toBe(Types.CONNECTION.LOST)

    // wait how long we delay before attempting to reconnect
    await pause(STARTING_DELAY)

    // should have invoked our attempt reconnect function
    expect(client.__beginAttemptReconnect.mock.calls.length).toBe(1)
    expect(client.__beginAttemptReconnect.mock.calls[0][0]).toBe(code)

    // should have composed a new socket
    expect(client._composeSocket.mock.calls.length).toBe(2)

    // should still have a double starting delay
    expect(client.__reconnectDelay).toBe(STARTING_DELAY * 2)
    expect(client.hasPulse()).toBe(false)

    // if we receive a message, we should reset our reconnect attempt values
    mockedHeartbeatSocket.trigger(HeartbeatSocket.EVENT_MESSAGE_RECEIVED, data)

    expect(client.hasPulse()).toBe(true)
    expect(client.__reconnectDelay).toBe(STARTING_DELAY)

    // wait our connection delay time, should have triggered a connection found event
    await pause(100)
    expect(client.trigger.mock.calls[client.trigger.mock.calls.length -1][0]).toBe(Types.CONNECTION.FOUND)
  })
})