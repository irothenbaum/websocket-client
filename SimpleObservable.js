class SimpleObservable {
  constructor() {
    this.__observers = []
    this.__counter = 0

    this.on = this.on.bind(this)
    this.off = this.off.bind(this)
    this.trigger = this.trigger.bind(this)
  }

  /**
   * @param {string} name
   * @param {*} payload
   */
  trigger(name, payload = null) {
    let oncesToRemove = []
    for (let i = 0; i < this.__observers.length; i++) {
      let o = this.__observers[i]

      if ((typeof o.match === 'string' && o.match === name) || (o.match instanceof RegExp && o.match.test(name))) {
        if (o.isOnce) {
          oncesToRemove.push(o.id)
        }
        o.handler(payload, name)
      } else {
        // do nothing
      }
    }

    // if any of those were firce one observers, we remove them now
    if (oncesToRemove.length > 0) {
      oncesToRemove.forEach(id => {
        this.off(id)
      })
    }
  }

  /**
   * name can be either a string literal (for exact match) or a regular expression to capture different event
   * @param {string|object} name
   * @param {function} handler
   * @param {boolean} isOnce
   * @returns {number}
   */
  on(name, handler, isOnce = false) {
    let id = ++this.__counter
    this.__observers.push({
      id: id,
      match: name,
      handler: handler,
      isOnce: isOnce,
    })
    return id
  }

  /**
   * @param {number|function} idOrHandler
   * @returns {function|boolean}
   */
  off(idOrHandler) {
    if (typeof idOrHandler === 'number') {
      return this.__offByProp(idOrHandler, 'id')
    } else if (typeof idOrHandler === 'function') {
      return this.__offByProp(idOrHandler, 'handler')
    } else {
      // definitely did not unbind anything => return false
      return false
    }
  }

  _clearObservables() {
    this.__observers = []
  }

  /**
   * @param {*} valToMatch
   * @param {string} prop
   * @private
   */
  __offByProp(valToMatch, prop) {
    let toPop = false
    this.__observers.every((o, i) => {
      if (o[prop] === valToMatch) {
        toPop = i
        return false
      }
      return true
    })
    if (toPop !== false) {
      let popped = this.__observers.splice(toPop, 1)
      return popped.handler
    }
    return false
  }
}

export default SimpleObservable
