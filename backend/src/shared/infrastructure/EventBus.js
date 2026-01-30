const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    if (!EventBus.instance) {
      EventBus.instance = this;
    }
    return EventBus.instance;
  }
}

const instance = new EventBus();
Object.freeze(instance);

module.exports = instance;
