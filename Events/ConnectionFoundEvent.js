import Event from './Event'
const Types = require('./Types')

class ConnectionFoundEvent extends Event {
  constructor() {
    super(Types.CONNECTION.FOUND)
  }
}

export default ConnectionFoundEvent
