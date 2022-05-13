import Event from './Event.js'
import Types from './Types.js'

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
