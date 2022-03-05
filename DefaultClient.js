import HeartbeatSocket, {HeartbeatConnectionError} from './HeartbeatSocket'
import SimpleObservable from './SimpleObservable'
const Types = require('./Events/Types')
import ConnectionInitEvent from './Events/ConnectionInitEvent'
import ConnectionWaitingEvent from './Events/ConnectionWaitingEvent'
import ConnectionReadyEvent from './Events/ConnectionReadyEvent'
import ConnectionLostEvent from "./Events/ConnectionLostEvent";
import ConnectionFoundEvent from "./Events/ConnectionFoundEvent"

// 1 minute
const MAX_DELAY = 60000
// 1 second
const STARTING_DELAY = 1000

class DefaultClient extends SimpleObservable {
  constructor() {
    super()

    this.__recoveryCode = undefined
    this.__connection = undefined
    this.__reconnectDelay = STARTING_DELAY
    this.__hasPulse = false

    this.__handleDataMessage = this.__handleDataMessage.bind(this)
  }

  /**
   * @param {string?} code
   * @return {Promise<void>}
   */
  async init(code) {
    await this.close()

    let url = this._getConnectURL(code)
    this.__connection = this._composeSocket(code, url)

    // we only trigger the init event on Init
    const initEvent = new ConnectionInitEvent(code)
    this.__connection.send(initEvent.type, initEvent)
    this.trigger(initEvent.type, initEvent)
  }

  /**
   * @returns {Promise<void>}
   */
  async close() {
    if (this.__connection) {
      this.__connection.close()
      this.trigger(Types.CONNECTION.CLOSE)
    }

    delete this.__connection
    clearTimeout(this.__reconnectTimeout)
  }

  /**
   * @returns {boolean}
   */
  hasPulse() {
    return this.__hasPulse
  }

  // Add functions to shorthand creating events
  // i.e.:
  /*

  markPlayerReady(status) {
    let eventInstance = new GamePlayerReadyEvent(status)
    this.__connection.send(eventInstance.type, eventInstance)
  }

   */

  // ------------------------------------------------------------------------------------------
  // PROTECTED FUNCTIONS

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
   * Override this function handle creating a new url
   * @param {string} code
   * @return {string}
   * @private
   */
  _getConnectURL(code) {
    const endpoint = code ? `/versus/${code}/join` : `/versus/create/${code}`
    return window.location.origin.replace('http', 'ws') + endpoint
  }

  /**
   * Override this function handle creating a new url
   * @param {string} code
   * @return {string}
   * @private
   */
  _getReconnectURL(code) {
    return this._getConnectURL(code) + `/${this.__recoveryCode}`
  }

  /**
   * @param {string} code
   * @param {string} url
   * @returns {HeartbeatSocket}
   * @private
   */
  _composeSocket(code, url) {
    const socket =  new HeartbeatSocket(url, Types.CONNECTION.HEARTBEAT)
    socket.on(HeartbeatSocket.EVENT_MESSAGE_RECEIVED, this.__handleDataMessage)
    socket.on(HeartbeatSocket.EVENT_CONNECTION_ERROR, error => {
      if (error instanceof HeartbeatConnectionError) {
        let event = new ConnectionLostEvent()
        this.trigger(event.type, event)
        this.__connection.close()

        this.__reconnectTimeout = setTimeout(() => this.__beginAttemptReconnect(code), this.__reconnectDelay)

      }
      console.error(error)
    })
    socket.on(HeartbeatSocket.EVENT_CONNECTION_CLOSED, () => {
      this.__hasPulse = false
      delete this.__connection
    })

    return socket
  }

  // ------------------------------------------------------------------------------------------
  // PRIVATE FUNCTIONS

  /**
   * @param {string} code
   * @private
   */
  __beginAttemptReconnect(code) {
    let url = this._getReconnectURL(code)
    this.__connection = this._composeSocket(code, url)

    // here we broadcast that we've re-established a connection
    const foundEvent = new ConnectionFoundEvent()
    this.trigger(foundEvent.type, foundEvent)

    // make sure we never wait more than the max delay
    this.__reconnectDelay = Math.min(MAX_DELAY, this.__reconnectDelay * 2)
  }

  /**
   * @private
   * @param {DataMessage} dataMessage
   */
  __handleDataMessage(dataMessage) {
    this.__hasPulse = true
    // reset our reconnect timeout
    this.__reconnectDelay = STARTING_DELAY
    let event

    // build the correct event object given the type
    switch (dataMessage.type) {
      // -------------------------------------------------------------
      case Types.CONNECTION.WAITING:
        event = new ConnectionWaitingEvent(dataMessage.payload.connectCode, dataMessage.payload.recoveryCode)
        break

      case Types.CONNECTION.INIT:
        event = new ConnectionInitEvent(dataMessage.payload.connectCode)
        break

      case Types.CONNECTION.HEARTBEAT:
        // do nothing
        break

      case Types.CONNECTION.READY:
        // this payload is actually the entire GameMeta object, but we only need the recoveryCode
        this.__recoveryCode = dataMessage.payload.recoveryCode
        event = new ConnectionReadyEvent(this.__recoveryCode)
        break

      default:
        // -------------------------------------------------------------
        event = this._generateEventFromDataMessage(dataMessage)
        break
    }

    if (event) {
      // we override the timestamp to be the received socket message's Sent time.
      // we can always derive latency later using Date.now(), but the time it was sent is the important bit
      event.timestamp = dataMessage.timestampSent
      // broadcast the event
      this.trigger(dataMessage.type, event)
    }
  }
}

export default DefaultClient
