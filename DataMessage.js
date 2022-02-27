class DataMessage {
  /**
   * @param {string} type
   * @param {string} payload
   * @param {number} timestampSent
   * @param {number?} timestampReceived
   */
  constructor(type, payload, timestampSent, timestampReceived) {
    this.type = type
    this.payload = payload
    this.timestampSent = timestampSent
    this.timestampReceived = timestampReceived
  }

  /**
   * @param {string} type
   * @param {*?} payload
   * @returns {DataMessage}
   */
  static toSend(type, payload) {
    return new DataMessage(type, payload, Date.now())
  }

  /**
   * @param {string} jsonString
   * @returns {DataMessage}
   */
  static fromReceived(jsonString) {
    let data = JSON.parse(jsonString)
    return new DataMessage(
      data.type,
      data.payload,
      data.timestampSent,
      Date.now(),
    )
  }
}

export default DataMessage
