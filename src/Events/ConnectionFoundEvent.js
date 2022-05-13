import Event from './Event.js'
import Types from './Types.js'

class ConnectionFoundEvent extends Event {
  constructor() {
    super(Types.CONNECTION.FOUND)
  }
}

export default ConnectionFoundEvent
