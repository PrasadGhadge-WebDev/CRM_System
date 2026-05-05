const { sendEmail } = require('./emailService');

/**
 * A simple in-memory queue to handle background email tasks with retries.
 * This avoids blocking the main thread and handles transient failures systematically.
 */
class EmailQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Add a new email task to the queue
   */
  async add(payload) {
    this.queue.push({
      ...payload,
      attempts: 0,
      id: Date.now() + Math.random().toString(36).substr(2, 9)
    });
    
    console.log(`[Queue] Added new task. Current size: ${this.queue.length}`);
    
    if (!this.isProcessing) {
      this.process();
    }
  }

  /**
   * Process the queue sequentially
   */
  async process() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const task = this.queue[0];

    try {
      await sendEmail(task);
      // Success - remove from queue
      this.queue.shift();
      console.log(`[Queue] Task ${task.id} completed successfully.`);
    } catch (err) {
      task.attempts++;
      console.error(`[Queue] Task ${task.id} failed (Attempt ${task.attempts}). Error: ${err.message}`);

      if (task.attempts >= 3) {
        console.error(`[Queue] Task ${task.id} discarded after 3 failed attempts.`);
        this.queue.shift();
      } else {
        // Move to end of queue to retry later
        this.queue.push(this.queue.shift());
        // Wait a bit before next process to avoid spamming a failing server
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Process next task
    setImmediate(() => this.process());
  }
}

module.exports = new EmailQueue();
