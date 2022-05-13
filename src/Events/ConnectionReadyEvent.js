import Event from './Event.js'
import Types from './Types.js'

class ConnectionReadyEvent extends Event {
  /**
   * @param {string} recoveryCode
   */
  constructor(recoveryCode) {
    super(Types.CONNECTION.READY)

    this.recoveryCode = recoveryCode
  }
}

export default ConnectionReadyEvent
