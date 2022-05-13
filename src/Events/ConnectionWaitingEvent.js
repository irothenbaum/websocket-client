import Event from './Event.js'
import Types from './Types.js'

class ConnectionWaitingEvent extends Event {
  /**
   * @param {string} connectCode
   * @param {string?} recoveryCode
   */
  constructor(connectCode, recoveryCode) {
    super(Types.CONNECTION.WAITING)
    this.connectCode = connectCode
    this.recoveryCode = recoveryCode
  }
}

export default ConnectionWaitingEvent
