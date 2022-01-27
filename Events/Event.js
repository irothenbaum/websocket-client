class Event {
  constructor(type) {
    this.type = type
    this.timestamp = Date.now()
  }
}

export default Event
