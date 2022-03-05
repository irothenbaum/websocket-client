class Event {
  /**
   * @param {string} type
   */
  constructor(type) {
    this.type = type
    this.timestamp = Date.now()
  }
}

export default Event
