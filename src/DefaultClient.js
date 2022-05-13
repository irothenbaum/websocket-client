import HeartbeatSocket, {HeartbeatConnectionError} from './HeartbeatSocket.js'
import SimpleObservable from './SimpleObservable.js'
import Types from './Events/Types.js'
import ConnectionInitEvent from './Events/ConnectionInitEvent.js'
import ConnectionWaitingEvent from './Events/ConnectionWaitingEvent.js'
import ConnectionReadyEvent from './Events/ConnectionReadyEvent.js'
import ConnectionLostEvent from './Events/ConnectionLostEvent.js'
import ConnectionFoundEvent from './Events/ConnectionFoundEvent.js'

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
    this.__connection = this._configureSocket(code, url)

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
    this.getConnection().send(eventInstance.type, eventInstance)
  }

   */

  /**
   * @return {HeartbeatSocket}
   */
  getConnection() {
    return this.__connection
  }

  // ------------------------------------------------------------------------------------------
  // PROTECTED FUNCTIONS

  // Override this function to handle reading new custom event types
  /**
   * @param {DataMessage} dataMessage
   * @return {Event|null}
   */
  _generateEventFromDataMessage(dataMessage) {
    console.warn('Unrecognized Event Type: ' + dataMessage.type)
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
   * @param {string} url
   * @return {HeartbeatSocket}
   * @private
   */
  _composeSocket(url) {
    return new HeartbeatSocket(url, Types.CONNECTION.HEARTBEAT)
  }

  /**
   * @param {string} code
   * @param {string} url
   * @returns {HeartbeatSocket}
   * @private
   */
  _configureSocket(code, url) {
    const socket = this._composeSocket(url)
    socket.on(HeartbeatSocket.EVENT_MESSAGE_RECEIVED, dm => this.__handleDataMessage(dm))
    socket.on(HeartbeatSocket.EVENT_CONNECTION_ERROR, error => {
      if (error instanceof HeartbeatConnectionError) {
        // if this is the first time we've lost connection, reconnectTimeout will be at its starting value
        // and we'll want to send a Lost event. Subsequent failures to connect should not trigger another event
        if (this.__reconnectDelay === STARTING_DELAY) {
          let event = new ConnectionLostEvent(code)
          this.trigger(event.type, event)
        }

        this.__reconnectTimeout = setTimeout(() => {
          delete this.__reconnectTimeout
          this.__beginAttemptReconnect(code)
        }, this.__reconnectDelay)
        // make sure we never wait more than the max delay
        this.__reconnectDelay = Math.min(MAX_DELAY, this.__reconnectDelay * 2)
        this.__connection.close()
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
    this.__connection = this._configureSocket(code, url)

    this.__connection.waitForConnection().then(() => {
      // here we broadcast that we've re-established a connection
      const foundEvent = new ConnectionFoundEvent()
      this.trigger(foundEvent.type, foundEvent)
    }).catch(err => {
      // do nothing, we catch it when the HeartbeatSocket.EVENT_CONNECTION_ERROR is caught
    })
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
