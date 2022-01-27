import SimpleObservable from './SimpleObservable'
import DataMessage from './DataMessage'

// 50 milliseconds
const QUEUE_CHECK_TIMEOUT = 50

// 1 === WebSocket.OPEN
const OPEN_STATE = 1

class HeartbeatSocket extends SimpleObservable {
  /**
   * @param {string} url
   * @param {string} heartbeatEventType
   */
  constructor(url, heartbeatEventType) {
    super()
    this.send = this.send.bind(this)

    this.__missedHeartbeats = 0
    this.__heartbeatEventType = heartbeatEventType
    this.__queue = []
    this.__socket = new WebSocket(url)
    this.__socket.onopen = this.init.bind(this)
    this.__socket.onmessage = this.__handleSocketMessage.bind(this)
  }

  init() {
    this.startHeartbeat(1000)
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
        this.trigger(HeartbeatSocket.EVENT_CONNECTION_ERROR, e)
        this.close()
      }
    }, timeout)
  }

  /**
   * @param {string} type
   * @param {object?} data
   */
  send(type, data) {
    if (this.__socket.readyState !== OPEN_STATE) {
      this.__queue.push(arguments)
      this.__startQueue()
      return false
    } else {
      return this.__sendInternal(type, data)
    }
  }

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
   */
  __sendInternal(type, data) {
    let dataMessage = DataMessage.toSend(type, data)
    this.__socket.send(JSON.stringify(dataMessage))
    this.trigger(HeartbeatSocket.EVENT_MESSAGE_SENT, dataMessage)
  }

  __startQueue() {
    if (this.__queueInterval) {
      // do nothing, it's already started
      return
    }

    this.__queueInterval = setInterval(() => {
      if (this.__socket.readyState === OPEN_STATE) {
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
          } while (this.__queue.length > 0 && this.__socket.readyState === OPEN_STATE)

          // if we broke our loop because it died again, we need to re-start the poll
          // NOTE: This is only *needed* if it dies in the microsecond between the last send(...) and the while condition check
          // because if the send(...) failed it would have already started again
          if (this.__socket.readyState !== OPEN_STATE && this.__queue.length > 0) {
            this.__startQueue()
          }
        }
      }
    }, QUEUE_CHECK_TIMEOUT)
  }

  close() {
    clearInterval(this.__heartbeatInterval)
    delete this.__heartbeatInterval

    clearInterval(this.__queueInterval)
    delete this.__queueInterval

    this.__socket.close()
    this.trigger(HeartbeatSocket.EVENT_CONNECTION_CLOSED)
  }
}

HeartbeatSocket.EVENT_MESSAGE_SENT = 'HeartbeatSocket:message-sent' // data message payload
HeartbeatSocket.EVENT_MESSAGE_RECEIVED = 'HeartbeatSocket:message-received' // data message payload
HeartbeatSocket.EVENT_CONNECTION_OPENED = 'HeartbeatSocket:connection-opened' // no payload
HeartbeatSocket.EVENT_CONNECTION_CLOSED = 'HeartbeatSocket:connection-closed' // no payload
HeartbeatSocket.EVENT_CONNECTION_ERROR = 'HeartbeatSocket:connection-error' // error payload

// ----------------------------------------------------------------------------------------

class HeartbeatConnectionError extends Error {}

// ----------------------------------------------------------------------------------------

HeartbeatSocket.HeartbeatConnectionError = HeartbeatConnectionError
export default HeartbeatSocket
