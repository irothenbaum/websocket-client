import Event from './Event.js'
import Types from './Types.js'

class ConnectionInitEvent extends Event {
  /**
   * @param {string} code
   */
  constructor(code) {
    super(Types.CONNECTION.INIT)

    this.code = code
  }
}

export default ConnectionInitEvent
