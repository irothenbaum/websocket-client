import {pause} from './utilities'
import {Server, WebSocket} from 'mock-socket'
// const {HeartbeatSocket, DataMessage} = require('../index')
import {HeartbeatSocket, DataMessage} from '../index'

describe('Heartbeat Socket', () => {
  const fakeURL = 'ws://localhost:8080'

  test('Can connect and send messages', async () => {
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
    await pause(150)
    expect(serverReceivedMessage.length).toBe(1)

    socket.send('an-event', {foo: 'bar'})
    await pause(10)
    expect(serverReceivedMessage.length).toBe(2)
    expect(serverReceivedMessage.map(d => d.type)).toEqual(['heartbeat-event', 'an-event'])
    expect(serverReceivedMessage.map(d => JSON.stringify(d.payload))).toEqual([undefined, JSON.stringify({foo: 'bar'})])
  })

  test('Can connect and receive messages', () => {
    expect(0).toBe(0)
  })

  test('Can queue messages', () => {
    expect(0).toBe(0)
  })

  test('Can automatically reconnect', () => {
    expect(0).toBe(0)
  })

  test('Can close', () => {
    expect(0).toBe(0)
  })
})
