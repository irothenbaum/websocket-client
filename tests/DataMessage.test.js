import {DataMessage} from '../index.js'

const THEN = 1646521219401
const NOW = 1646521375749

describe('DataMessage payload', () => {
  test('Builds correct payload', () => {
    Date.now = () => NOW
    const message = JSON.stringify({
      type: 'my-type',
      payload: {foo: 'bar'},
      timestampSent: THEN,
    })

    let d = DataMessage.fromReceived(message)
    expect(d).toBeInstanceOf(DataMessage)
    expect(d.type).toBe('my-type')
    expect(d.payload.foo).toBe('bar')
    expect(d.timestampSent).toBe(THEN)
    expect(d.timestampReceived).toBe(NOW)
  })

  test('Compiles to correct structure', () => {
    Date.now = () => NOW
    let d = DataMessage.toSend('my-type', {bar: 'foo'})
    expect(d).toBeInstanceOf(DataMessage)
    expect(d.type).toBe('my-type')
    expect(d.payload.bar).toBe('foo')
    expect(d.timestampSent).toBe(NOW)
    expect(d.timestampReceived).toBe(undefined)
  })

  test('Constructs correct payload', () => {
    let d = new DataMessage('my-type', {foo: 'bar'}, NOW)
    expect(d).toBeInstanceOf(DataMessage)
    expect(d.type).toBe('my-type')
    expect(d.payload.foo).toBe('bar')
    expect(d.timestampSent).toBe(NOW)
    expect(d.timestampReceived).toBe(undefined)
  })
})
