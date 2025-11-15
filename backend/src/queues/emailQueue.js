const Queue = require('bull');
const logger = require('../config/logger');
const { sendEmail } = require('../services/emailService');

// Create email queue with Redis connection
const emailQueue = new Queue('email', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay, then 4s, 8s
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

// Process email jobs
emailQueue.process('sendEmail', async (job) => {
  const { to, subject, html, attachments } = job.data;
  
  logger.info({
    type: 'QUEUE',
    queue: 'email',
    jobId: job.id,
    action: 'processing',
    to,
    subject,
  });

  try {
    const result = await sendEmail(to, subject, html, attachments);
    
    logger.info({
      type: 'QUEUE',
      queue: 'email',
      jobId: job.id,
      action: 'completed',
      to,
      subject,
    });

    return result;
  } catch (error) {
    logger.error({
      type: 'QUEUE',
      queue: 'email',
      jobId: job.id,
      action: 'failed',
      to,
      subject,
      error: error.message,
      stack: error.stack,
    });
    
    throw error; // This will trigger retry
  }
});

// Process bulk email jobs
emailQueue.process('sendBulkEmail', async (job) => {
  const { recipients, subject, html } = job.data;
  
  logger.info({
    type: 'QUEUE',
    queue: 'email',
    jobId: job.id,
    action: 'processing_bulk',
    recipientCount: recipients.length,
    subject,
  });

  const results = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const recipient of recipients) {
    try {
      await sendEmail(recipient.email, subject, html, recipient.attachments);
      results.successful++;
      
      // Update job progress
      const progress = Math.round((results.successful + results.failed) / recipients.length * 100);
      job.progress(progress);
    } catch (error) {
      results.failed++;
      results.errors.push({
        email: recipient.email,
        error: error.message,
      });
      
      logger.error({
        type: 'QUEUE',
        queue: 'email',
        jobId: job.id,
        action: 'bulk_email_failed',
        email: recipient.email,
        error: error.message,
      });
    }
  }

  logger.info({
    type: 'QUEUE',
    queue: 'email',
    jobId: job.id,
    action: 'bulk_completed',
    results,
  });

  return results;
});

// Queue event listeners
emailQueue.on('completed', (job, result) => {
  logger.debug({
    type: 'QUEUE_EVENT',
    event: 'completed',
    jobId: job.id,
    queue: 'email',
  });
});

emailQueue.on('failed', (job, err) => {
  logger.error({
    type: 'QUEUE_EVENT',
    event: 'failed',
    jobId: job.id,
    queue: 'email',
    error: err.message,
    attempts: job.attemptsMade,
  });
});

emailQueue.on('stalled', (job) => {
  logger.warn({
    type: 'QUEUE_EVENT',
    event: 'stalled',
    jobId: job.id,
    queue: 'email',
  });
});

emailQueue.on('error', (error) => {
  logger.error({
    type: 'QUEUE_EVENT',
    event: 'error',
    queue: 'email',
    error: error.message,
  });
});

// Helper functions to add jobs to queue
const queueEmail = {
  /**
   * Send single email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @param {Array} attachments - Email attachments
   * @param {Object} options - Job options (priority, delay, etc.)
   * @returns {Promise<Job>}
   */
  async sendEmail(to, subject, html, attachments = [], options = {}) {
    const job = await emailQueue.add('sendEmail', {
      to,
      subject,
      html,
      attachments,
    }, {
      priority: options.priority || 5,
      delay: options.delay || 0,
    });

    logger.info({
      type: 'QUEUE',
      action: 'job_added',
      queue: 'email',
      jobType: 'sendEmail',
      jobId: job.id,
      to,
      subject,
    });

    return job;
  },

  /**
   * Send bulk emails
   * @param {Array} recipients - Array of {email, attachments}
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @param {Object} options - Job options
   * @returns {Promise<Job>}
   */
  async sendBulkEmail(recipients, subject, html, options = {}) {
    const job = await emailQueue.add('sendBulkEmail', {
      recipients,
      subject,
      html,
    }, {
      priority: options.priority || 3,
      delay: options.delay || 0,
    });

    logger.info({
      type: 'QUEUE',
      action: 'job_added',
      queue: 'email',
      jobType: 'sendBulkEmail',
      jobId: job.id,
      recipientCount: recipients.length,
      subject,
    });

    return job;
  },

  /**
   * Get queue statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  },

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Job>}
   */
  async getJob(jobId) {
    return await emailQueue.getJob(jobId);
  },

  /**
   * Remove job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<void>}
   */
  async removeJob(jobId) {
    const job = await emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info({
        type: 'QUEUE',
        action: 'job_removed',
        queue: 'email',
        jobId,
      });
    }
  },

  /**
   * Clean old jobs
   * @param {number} grace - Grace period in milliseconds
   * @returns {Promise<Object>}
   */
  async clean(grace = 24 * 60 * 60 * 1000) {
    const [completedRemoved, failedRemoved] = await Promise.all([
      emailQueue.clean(grace, 'completed'),
      emailQueue.clean(grace, 'failed'),
    ]);

    logger.info({
      type: 'QUEUE',
      action: 'cleaned',
      queue: 'email',
      completedRemoved,
      failedRemoved,
    });

    return { completedRemoved, failedRemoved };
  },

  /**
   * Pause queue
   */
  async pause() {
    await emailQueue.pause();
    logger.warn({
      type: 'QUEUE',
      action: 'paused',
      queue: 'email',
    });
  },

  /**
   * Resume queue
   */
  async resume() {
    await emailQueue.resume();
    logger.info({
      type: 'QUEUE',
      action: 'resumed',
      queue: 'email',
    });
  },

  /**
   * Get queue instance
   */
  getQueue() {
    return emailQueue;
  },
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing email queue gracefully...');
  await emailQueue.close();
});

module.exports = queueEmail;
