import {expect, jest} from '@jest/globals'
import {pause} from './utilities'
import {Server, WebSocket} from 'mock-socket'
// const {HeartbeatSocket, DataMessage} = require('../index')
import {HeartbeatSocket, DataMessage} from '../index'

describe('Heartbeat Socket', () => {
  const fakeURL = 'ws://localhost:8080'

  test('Can connect, heartbeat, and send messages', async () => {
    const mockServer = new Server(fakeURL)
    const serverReceivedMessage = []

    mockServer.on('connection', s => {
      s.on('message', async function (msg) {
        let data = DataMessage.fromReceived(msg)
        serverReceivedMessage.push(data)
      })
    })

    const socket = new HeartbeatSocket(fakeURL, 'heartbeat-event', 100)
    expect(serverReceivedMessage.length).toBe(0)
    // just above the heart beat interval
    await pause(150)
    expect(serverReceivedMessage.length).toBe(1)

    socket.send('an-event', {foo: 'bar'})
    await pause(10)
    expect(serverReceivedMessage.length).toBe(2)
    expect(serverReceivedMessage.map(d => d.type)).toEqual(['heartbeat-event', 'an-event'])
    expect(serverReceivedMessage.map(d => JSON.stringify(d.payload))).toEqual([undefined, JSON.stringify({foo: 'bar'})])

    await pause(150)
    expect(serverReceivedMessage.length).toBe(3)
    expect(serverReceivedMessage[2].type).toBe('heartbeat-event')

    mockServer.close()
  })

  test('Can connect and receive messages', async () => {
    const mockServer = new Server(fakeURL)

    let serverSideSocket
    mockServer.on('connection', s => {
      serverSideSocket = s
    })

    const clientSocket = new HeartbeatSocket(fakeURL, 'doesntmatter')

    clientSocket.trigger = jest.fn(clientSocket.trigger)
    expect(clientSocket.trigger.mock.calls.length).toBe(0)

    await pause(10)
    serverSideSocket.send(JSON.stringify({payload: {foo: 'bar', another: {bar: 'foo'}}}))
    await pause(10)

    expect(clientSocket.trigger.mock.calls.length).toBe(1)
    expect(clientSocket.trigger.mock.calls[0][0]).toBe(HeartbeatSocket.EVENT_MESSAGE_RECEIVED)
    let data = clientSocket.trigger.mock.calls[0][1]
    expect(data).toBeInstanceOf(DataMessage)
    expect(data.payload.foo).toBe('bar')
    expect(data.payload.another.bar).toBe('foo')

    mockServer.close()
  })

  test('Can queue messages', async () => {
    const mockServer = new Server(fakeURL)
    const clientSocket = new HeartbeatSocket(fakeURL, 'doesntmatter')

    await pause(10)
    expect(clientSocket.isOpen()).toBe(true)
    clientSocket.send('test 1')
    await pause(10)
    expect(clientSocket.__queue.length).toBe(0)

    // make it think it's closed
    clientSocket.isOpen = jest.fn(() => false)
    clientSocket.send('test 2')
    await pause(10)
    clientSocket.send('test 3', {widthData: true})
    expect(clientSocket.__queue.length).toBe(2)
    expect(clientSocket.__queue.map(arr => arr[0])).toEqual(['test 2', 'test 3'])
    expect(clientSocket.__queue.map(arr => JSON.stringify(arr[1]))).toEqual([
      undefined,
      JSON.stringify({widthData: true}),
    ])
    expect(clientSocket.__queueInterval).toBeTruthy()
    expect(clientSocket.isOpen.mock.calls.length).toBe(2)
    await pause(45)
    // it should be checking on an interval (this number is intentional just less than the QUEUE_CHECK_TIMEOUT)
    expect(clientSocket.isOpen.mock.calls.length).toBe(3)

    // now we want to mock the send function so we can see if the queue calls it correctly
    clientSocket.send = jest.fn(clientSocket.send)
    expect(clientSocket.send.mock.calls.length).toBe(0)

    // we also want to listen for the OPENED event so we assert some specific properties about our queue
    clientSocket.on(HeartbeatSocket.EVENT_CONNECTION_OPENED, () => {
      // it should have removed the queue interval
      expect(clientSocket.__queueInterval).toBeFalsy()
      // but not yet called Send on any of the queued items
      expect(clientSocket.__queue.length).toBe(2)
      expect(clientSocket.send.mock.calls.length).toBe(0)
    })

    // return our isOpen function to true
    clientSocket.isOpen = () => true

    // this number is intentional just greater than the QUEUE_CHECK_TIMEOUT
    await pause(55)

    expect(clientSocket.send.mock.calls.length).toBe(2)
    expect(clientSocket.send.mock.calls.map(args => args[0])).toEqual(['test 2', 'test 3'])
    expect(clientSocket.send.mock.calls.map(arr => JSON.stringify(arr[1]))).toEqual([
      undefined,
      JSON.stringify({widthData: true}),
    ])
    expect(clientSocket.__queueInterval).toBeFalsy()

    mockServer.close()
  })

  test('Can close', async () => {
    const mockServer = new Server(fakeURL)

    const clientSocket = new HeartbeatSocket(fakeURL, 'doesntmatter')

    await pause(10)

    clientSocket.trigger = jest.fn(clientSocket.trigger)
    expect(clientSocket.__heartbeatInterval).toBeTruthy()

    clientSocket.on(HeartbeatSocket.EVENT_CONNECTION_CLOSED, () => {
      expect(clientSocket.__heartbeatInterval).toBeFalsy()
      expect(clientSocket.__queueInterval).toBeFalsy()
      expect(clientSocket.isOpen()).toBe(false)
    })

    clientSocket.close()
    expect(clientSocket.trigger.mock.calls.length).toBe(1)
    expect(clientSocket.trigger.mock.calls[0][0]).toBe(HeartbeatSocket.EVENT_CONNECTION_CLOSED)

    mockServer.close()
  })
})
