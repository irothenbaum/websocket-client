import Event from './Event'
import Types from './Types'

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
