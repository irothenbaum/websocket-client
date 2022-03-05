import Event from './Event'
const Types = require('./Types')

class ConnectionLostEvent extends Event {
  constructor(connectCode) {
    super(Types.CONNECTION.LOST)
    this.connectCode = connectCode
  }
}

export default ConnectionLostEvent
