import SimpleObservable from './SimpleObservable.js'
import DataMessage from './DataMessage.js'

// 50 milliseconds
const QUEUE_CHECK_TIMEOUT = 50

// 1 === WebSocket.OPEN
const OPEN_STATE = 1

class HeartbeatSocket extends SimpleObservable {
  /**
   * @param {string} url
   * @param {string} heartbeatEventType
   * @param {number?} heartbeatRate
   */
  constructor(url, heartbeatEventType, heartbeatRate = 1000) {
    super()
    this.send = this.send.bind(this)

    this.__missedHeartbeats = 0
    this.__heartbeatEventType = heartbeatEventType
    this.__heartbeatRate = heartbeatRate
    this.__queue = []
    this.__hasConnected = false

    this.__socket = new WebSocket(url)
    this.__socket.onopen = () => {
      this.__hasConnected = true
      this.startHeartbeat(this.__heartbeatRate)
    }
    this.__socket.onmessage = this.__handleSocketMessage.bind(this)
    this.__socket.onerror = this.__handleError.bind(this)
  }

  /**
   * @return {Promise<HeartbeatSocket>}
   */
  async waitForConnection() {
    if (!this.__firstConnectionPromise) {
      this.__firstConnectionPromise = new Promise((resolve, reject) => {
        const interval = setInterval(() => {

          if (this.hasConnected()) {
            clearInterval(interval)
            resolve()
          } else if (!this.__firstConnectionPromise) {
            clearInterval(interval)
            reject()
          }
        }, 50)
      })
    }

    await this.__firstConnectionPromise
    return this
  }

  /**
   * @returns {boolean}
   */
  isOpen() {
    return this.__socket.readyState === OPEN_STATE
  }

  /**
   * @return {boolean}
   */
  hasConnected() {
    return this.__hasConnected
  }

  /**
   * @param {number} timeout
   * @protected
   */
  startHeartbeat(timeout) {
    // don't allow us to double-heartbeat
    if (this.__heartbeatInterval) {
      clearInterval(this.__heartbeatInterval)
    }

    this.__heartbeatInterval = setInterval(() => {
      try {
        this.__missedHeartbeats++
        if (this.__missedHeartbeats >= 3) {
          throw new HeartbeatConnectionError('3 missed heartbeats')
        }
        this.send(this.__heartbeatEventType)
      } catch (e) {
        this.__handleError(e)
      }
    }, timeout)
  }

  /**
   * @param {string} type
   * @param {object?} data
   */
  send(type, data) {
    if (!this.isOpen()) {
      this.__queue.push(arguments)
      this.__startQueue()
      return false
    } else {
      return this.__sendInternal(type, data)
    }
  }

  close() {
    clearInterval(this.__heartbeatInterval)
    delete this.__heartbeatInterval

    clearInterval(this.__queueInterval)
    delete this.__queueInterval

    this.__socket.close()
    this.trigger(HeartbeatSocket.EVENT_CONNECTION_CLOSED)
  }

  // --------------------------------------------------------------------------
  // PRIVATE FUNCTIONS

  /**
   * @param {string} data
   * @private
   */
  __handleSocketMessage({data}) {
    let dataObj = DataMessage.fromReceived(data)

    // if we received a heartbeat, we reset our missed heartbeat count to 0
    if (dataObj.type === this.__heartbeatEventType) {
      this.__missedHeartbeats = 0
    }

    // trigger our internal event handlers
    this.trigger(HeartbeatSocket.EVENT_MESSAGE_RECEIVED, dataObj)
  }

  /**
   * @param {string} type
   * @param {object?} data
   * @private
   */
  __sendInternal(type, data) {
    let dataMessage = DataMessage.toSend(type, data)
    this.__socket.send(JSON.stringify(dataMessage))
    this.trigger(HeartbeatSocket.EVENT_MESSAGE_SENT, dataMessage)
  }

  /**
   * @private
   */
  __startQueue() {
    if (this.__queueInterval) {
      // do nothing, it's already started
      return
    }

    this.__queueInterval = setInterval(() => {
      if (this.isOpen()) {
        // it's open, no need to continue checking
        clearInterval(this.__queueInterval)
        delete this.__queueInterval

        // notify that we're open again
        this.trigger(HeartbeatSocket.EVENT_CONNECTION_OPENED)

        // if we have a queue, we need to start sending it
        if (this.__queue.length > 0) {
          do {
            // grab the oldest item in the queue
            let args = this.__queue.shift()
            // NOTE: we call send not sendInternal because it could potentially die again
            // If it does die again, the queue will restart and that item will be back at the end.
            // so, while not ideal because it loses its place in line, it will properly prevent duplicates + dropped messages
            this.send(args[0], args[1])
          } while (this.__queue.length > 0 && this.isOpen())

          // if we broke our loop because it died again, we need to re-start the poll
          // NOTE: This is only *needed* if it dies in the microsecond between the last send(...) and the while condition check
          // because if the send(...) failed it would have already started again
          if (!this.isOpen() && this.__queue.length > 0) {
            this.__startQueue()
          }
        }
      }
    }, QUEUE_CHECK_TIMEOUT)
  }

  /**
   * @param {Error} e
   * @private
   */
  __handleError(e) {
    // by deleting this reference, our waitTillConnected poll will recognize it's failed
    delete this.__firstConnectionPromise

    this.trigger(HeartbeatSocket.EVENT_CONNECTION_ERROR, e)
    this.close()
  }
}

HeartbeatSocket.EVENT_MESSAGE_SENT = 'HeartbeatSocket:message-sent' // data message payload
HeartbeatSocket.EVENT_MESSAGE_RECEIVED = 'HeartbeatSocket:message-received' // data message payload
HeartbeatSocket.EVENT_CONNECTION_OPENED = 'HeartbeatSocket:connection-opened' // no payload
HeartbeatSocket.EVENT_CONNECTION_CLOSED = 'HeartbeatSocket:connection-closed' // no payload
HeartbeatSocket.EVENT_CONNECTION_ERROR = 'HeartbeatSocket:connection-error' // error payload

// ----------------------------------------------------------------------------------------

export class HeartbeatConnectionError extends Error {}

// ----------------------------------------------------------------------------------------

HeartbeatSocket.HeartbeatConnectionError = HeartbeatConnectionError
export default HeartbeatSocket
