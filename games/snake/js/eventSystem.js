/**
 * Event System - Provides pub/sub functionality for communication between modules
 * Allows modules to emit and subscribe to events, reducing direct dependencies
 */
const EventSystem = {
  events: {},

  /**
   * Subscribe to an event
   * @param {string} eventName - The name of the event to subscribe to
   * @param {function} callback - The function to execute when the event is emitted
   * @returns {function} A function to unsubscribe
   */
  subscribe(eventName, callback) {
    // Create the event array if it doesn't exist
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    // Add callback to the event array
    this.events[eventName].push(callback);

    // Return an unsubscribe function
    return () => {
      this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    };
  },

  /**
   * Alias for subscribe (common event pattern)
   * @param {string} eventName - The name of the event to subscribe to
   * @param {function} callback - The function to execute when the event is emitted
   * @returns {function} A function to unsubscribe
   */
  on(eventName, callback) {
    return this.subscribe(eventName, callback);
  },

  /**
   * Emit an event
   * @param {string} eventName - The name of the event to emit
   * @param {any} data - The data to pass to subscribers
   */
  emit(eventName, data) {
    // If there are no subscribers, do nothing
    if (!this.events[eventName]) {
      return;
    }

    // Execute all subscribers with the provided data
    this.events[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });
  },

  /**
   * Remove all subscribers for an event
   * @param {string} eventName - The name of the event to clear
   */
  clearEvent(eventName) {
    if (this.events[eventName]) {
      delete this.events[eventName];
    }
  },

  /**
   * Remove all subscribers for all events
   */
  clearAllEvents() {
    this.events = {};
  }
};