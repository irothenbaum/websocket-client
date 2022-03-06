import {expect, jest} from "@jest/globals";
import {SimpleObservable} from "../index.js";

describe('Simple Observable', () => {
  test('Can subscribe with string literal', () => {
    const obs = new SimpleObservable()

    const testPayload1 = {foo: 'bar'}
    const testPayload2 = {bar: 'foo'}

    const event1Handler = jest.fn((payload, name) => {
      expect(payload).toBe(testPayload1)
      expect(name).toBe('my-event')
    })

    const event2Handler = jest.fn((payload, name) => {
      expect(payload).toBe(testPayload2)
      expect(name).toBe('my-event-2')
    })

    expect(event1Handler.mock.calls.length).toBe(0)
    expect(event2Handler.mock.calls.length).toBe(0)

    obs.on('my-event', event1Handler)
    obs.on('my-event-2', event2Handler)

    obs.trigger('my-event', testPayload1)

    expect(event1Handler.mock.calls.length).toBe(1)
    expect(event2Handler.mock.calls.length).toBe(0)

    obs.trigger('my-event-2', testPayload2)
    expect(event1Handler.mock.calls.length).toBe(1)
    expect(event2Handler.mock.calls.length).toBe(1)

    // shouldn't call the handler at all
    obs.trigger('my-event-3', testPayload2)
    expect(event1Handler.mock.calls.length).toBe(1)
    expect(event2Handler.mock.calls.length).toBe(1)
  })

  test('Can subscribe with regExp', () => {
    const obs = new SimpleObservable()
    const regEx = /^event-[0-9]$/
    const testPayload = {foo: 'bar'}
    const eventHandler = jest.fn((payload, name) => {
      expect(payload).toBe(testPayload)
    })

    obs.on(regEx, eventHandler)

    obs.trigger('non-match', testPayload)
    expect(eventHandler.mock.calls.length).toBe(0)

    // also a non -match
    obs.trigger('event-12', testPayload)
    expect(eventHandler.mock.calls.length).toBe(0)

    obs.trigger('event-1', testPayload)
    expect(eventHandler.mock.calls.length).toBe(1)

    obs.trigger('event-5', testPayload)
    expect(eventHandler.mock.calls.length).toBe(2)

    obs.trigger('non-match', testPayload)
    expect(eventHandler.mock.calls.length).toBe(2)
  })

  test('Can unsubscribe with id', () => {
    const obs = new SimpleObservable()
    const testPayload = {foo: 'bar'}
    const eventHandler = jest.fn((payload, name) => {
      expect(payload).toBe(testPayload)
    })

    let unsub = obs.on('event', eventHandler)
    expect(eventHandler.mock.calls.length).toBe(0)

    obs.trigger('event', testPayload)
    expect(eventHandler.mock.calls.length).toBe(1)

    obs.trigger('event', testPayload)
    expect(eventHandler.mock.calls.length).toBe(2)

    obs.off(unsub)
    // should not call handler when stop listening
    expect(eventHandler.mock.calls.length).toBe(2)

    obs.trigger('event', testPayload)
    obs.trigger('event', testPayload)
    obs.trigger('event', testPayload)
    // additional triggers shouldn't change the invocation count
    expect(eventHandler.mock.calls.length).toBe(2)
  })

  test('Can unsubscribe with handler', () => {
    const obs = new SimpleObservable()
    const testPayload = {foo: 'bar'}
    const eventHandler = jest.fn((payload, name) => {
      expect(payload).toBe(testPayload)
    })

    obs.on('event', eventHandler)
    expect(eventHandler.mock.calls.length).toBe(0)

    obs.trigger('event', testPayload)
    expect(eventHandler.mock.calls.length).toBe(1)

    obs.trigger('event', testPayload)
    expect(eventHandler.mock.calls.length).toBe(2)

    obs.off(eventHandler)
    // should not call handler when stop listening
    expect(eventHandler.mock.calls.length).toBe(2)

    obs.trigger('event', testPayload)
    obs.trigger('event', testPayload)
    obs.trigger('event', testPayload)
    // additional triggers shouldn't change the invocation count
    expect(eventHandler.mock.calls.length).toBe(2)
  })
})