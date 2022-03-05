import Event from './Event'
import Types from './Types'

class ConnectionFoundEvent extends Event {
  constructor() {
    super(Types.CONNECTION.FOUND)
  }
}

export default ConnectionFoundEvent
