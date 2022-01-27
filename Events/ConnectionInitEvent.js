import Event from './Event'
const Types = require('./Types')

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
