import HeartbeatSocket from './HeartbeatSocket'
import SimpleObservable from './SimpleObservable'
const Types = require('./Events/Types')
import ConnectionInitEvent from './Events/ConnectionInitEvent'
import ConnectionWaitingEvent from './Events/ConnectionWaitingEvent'
import ConnectionReadyEvent from './Events/ConnectionReadyEvent'

class VersusClient extends SimpleObservable {
  constructor() {
    super()

    this.__handleDataMessage = this.__handleDataMessage.bind(this)
  }

  /**
   * @param {string?} code
   * @return {Promise<void>}
   */
  async init(code) {
    await this.close()

    let endpoint = code ? `/game/${code}/join` : '/game/create'
    const url = window.location.origin.replace('http', 'ws') + endpoint
    this.__connection = new HeartbeatSocket(url, Types.CONNECTION.HEARTBEAT)
    this.__connection.on(HeartbeatSocket.EVENT_MESSAGE_RECEIVED, this.__handleDataMessage)
    this.__connection.on(HeartbeatSocket.EVENT_CONNECTION_ERROR, error => {
      console.error(error)
    })
    this.__connection.on(HeartbeatSocket.EVENT_CONNECTION_CLOSED, () => {
      console.log('CONNECTION CLOSED')
    })
    const initEvent = new ConnectionInitEvent(code)
    this.__connection.send(Types.CONNECTION.INIT, initEvent)
    this.trigger(Types.CONNECTION.INIT, initEvent)
  }

  async close() {
    if (this.__connection) {
      this.__connection.close()
      this.trigger(Types.CONNECTION.CLOSE)
    }
  }

  // Add functions to shorthand creating events here
  // i.e.:
  /*

  markPlayerReady(status) {
    let eventInstance = new GamePlayerReadyEvent(status)
    this.__connection.send(eventInstance.type, eventInstance)
  }

   */

  /**
   * @private
   * @param {DataMessage} dataMessage
   */
  __handleDataMessage(dataMessage) {
    let event

    // build the correct event object given the type
    switch (dataMessage.type) {
      // -------------------------------------------------------------
      // Add custom event handling here

      // -------------------------------------------------------------
      case Types.CONNECTION.WAITING:
        event = new ConnectionWaitingEvent(dataMessage.payload.connectCode)
        break

      case Types.CONNECTION.INIT:
        event = new ConnectionInitEvent(dataMessage.payload.connectCode)
        break

      case Types.CONNECTION.HEARTBEAT:
        // do nothing
        break

      case Types.CONNECTION.READY:
        event = new ConnectionReadyEvent()
        break

      default:
        console.log('Unrecognized Event Type: ' + dataMessage.type)
    }

    if (event) {
      event.timestamp = dataMessage.timestampSent
      // broadcast the event
      this.trigger(dataMessage.type, event)
    }
  }
}

export default VersusClient
