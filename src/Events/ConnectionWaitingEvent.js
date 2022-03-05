import Event from './Event'
import Types from './Types'

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
