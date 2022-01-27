import Event from './Event'
const Types = require('./Types')

class ConnectionWaitingEvent extends Event {
  constructor(connectCode) {
    super(Types.CONNECTION.WAITING)
    this.connectCode = connectCode
  }
}

export default ConnectionWaitingEvent
