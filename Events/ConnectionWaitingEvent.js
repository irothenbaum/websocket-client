import Event from './Event'
const Types = require('./Types')

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
