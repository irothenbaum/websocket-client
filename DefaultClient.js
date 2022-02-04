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

    let url = this._getConnectURL(code)
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

  // Add functions to shorthand creating events
  // i.e.:
  /*

  markPlayerReady(status) {
    let eventInstance = new GamePlayerReadyEvent(status)
    this.__connection.send(eventInstance.type, eventInstance)
  }

   */

  // Override this function to handle reading new custom event types
  /**
   * @param {DataMessage} dataMessage
   * @return {Event|null}
   */
  _generateEventFromDataMessage(dataMessage) {
    console.log('Unrecognized Event Type: ' + dataMessage.type)
    return null
  }

  /**
   * @param {string} code
   * @return {string}
   * @private
   */
  _getConnectURL(code) {
    const endpoint = code ? `/versus/${code}/join` : '/versus/create'
    return window.location.origin.replace('http', 'ws') + endpoint
  }

  /**
   * @private
   * @param {DataMessage} dataMessage
   */
  __handleDataMessage(dataMessage) {
    let event

    // build the correct event object given the type
    switch (dataMessage.type) {
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
        // -------------------------------------------------------------
        event = this._generateEventFromDataMessage(dataMessage)
        break
    }

    if (event) {
      event.timestamp = dataMessage.timestampSent
      // broadcast the event
      this.trigger(dataMessage.type, event)
    }
  }
}

export default VersusClient
