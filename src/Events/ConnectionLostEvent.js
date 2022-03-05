import Event from './Event'
import Types from './Types'

class ConnectionLostEvent extends Event {
  /**
   * @param {string} connectCode
   */
  constructor(connectCode) {
    super(Types.CONNECTION.LOST)
    this.connectCode = connectCode
  }
}

export default ConnectionLostEvent
