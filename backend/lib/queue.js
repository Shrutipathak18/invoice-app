import { createId, nowIso } from './utils.js';

export class InMemoryQueue {
  constructor({ worker, intervalMs = 1000 }) {
    this.queue = [];
    this.worker = worker;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.processing = false;
  }

  add(type, payload) {
    const job = {
      id: createId('job'),
      type,
      payload,
      status: 'queued',
      attempts: 0,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.queue.push(job);
    return job;
  }

  list() {
    return [...this.queue];
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.processNext(), this.intervalMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async processNext() {
    if (this.processing) return;
    const job = this.queue.find((candidate) => candidate.status === 'queued');
    if (!job) return;

    this.processing = true;
    job.status = 'running';
    job.attempts += 1;
    job.updatedAt = nowIso();

    try {
      await this.worker(job);
      job.status = 'completed';
      job.updatedAt = nowIso();
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.updatedAt = nowIso();
    } finally {
      this.processing = false;
    }
  }
}
