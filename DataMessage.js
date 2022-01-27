class DataMessage {
  /**
   * @param {string} type
   * @param {*?} payload
   * @returns {DataMessage}
   */
  static toSend(type, payload) {
    let retVal = new DataMessage()
    retVal.type = type
    retVal.payload = payload
    retVal.timestampSent = Date.now()
    return retVal
  }

  /**
   * @param {string} jsonString
   * @returns {DataMessage}
   */
  static fromReceived(jsonString) {
    let data = JSON.parse(jsonString)
    let retVal = new DataMessage()
    retVal.type = data.type
    retVal.payload = data.payload
    retVal.timestampSent = data.timestampSent
    retVal.timestampReceived = Date.now()
    return retVal
  }
}

export default DataMessage
