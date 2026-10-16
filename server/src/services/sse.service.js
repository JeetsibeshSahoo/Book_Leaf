/**
 * Real-Time Server-Sent Events (SSE) Manager.
 * Maintains client streams for live ticket timelines and admin queue updates.
 */

// Map of ticketId -> Set of active Express Response objects
const ticketSubscribers = new Map();

// Set of active Express Response objects watching the global Admin Queue
const queueSubscribers = new Set();

// Sets standard HTTP headers required for Server-Sent Events.
const setSSEHeaders = (res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', 
  });
  res.flushHeaders?.();
};

/**
 * Subscribes a client (Author or Admin) to real-time events for a specific ticket.
 * Whenever an admin replies or changes status, all watchers of this ticket receive the update.
 * 
 * @param {string} ticketId - UUID of the ticket
 * @param {import('express').Response} res - Express response stream
 * @param {import('express').Request} req - Express request object
 */
export const subscribeToTicket = (ticketId, res, req) => {
  setSSEHeaders(res);

  if (!ticketSubscribers.has(ticketId)) {
    ticketSubscribers.set(ticketId, new Set());
  }

  const subscribers = ticketSubscribers.get(ticketId);
  subscribers.add(res);

  // Send an immediate handshake packet to confirm connection
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Live stream connected', ticketId })}\n\n`);

  // Periodic heartbeat every 25 seconds to keep connection alive through firewalls
  const heartbeatTimer = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  // Clean up when client disconnects or closes browser tab
  req.on('close', () => {
    clearInterval(heartbeatTimer);
    subscribers.delete(res);
    if (subscribers.size === 0) {
      ticketSubscribers.delete(ticketId);
    }
  });
};

// Subscribes an Admin to real-time global queue events (new tickets created, priority overrides).
export const subscribeToQueue = (res, req) => {
  setSSEHeaders(res);
  queueSubscribers.add(res);

  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Admin queue stream connected' })}\n\n`);

  const heartbeatTimer = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    queueSubscribers.delete(res);
  });
};

/**
 * Broadcasts an event to all clients actively watching a specific ticket.
 * 
 * @param {string} ticketId - Ticket UUID
 * @param {string} eventName - Name of the event (e.g. 'new_message', 'status_changed')
 * @param {object} payload - Event data payload
 */
export const broadcastTicketUpdate = (ticketId, eventName, payload) => {
  const subscribers = ticketSubscribers.get(ticketId);
  if (!subscribers || subscribers.size === 0) return;

  const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  subscribers.forEach((clientRes) => {
    try {
      clientRes.write(message);
    } catch (err) {
      console.warn('⚠️ Error sending SSE to ticket subscriber:', err.message);
    }
  });
};

/**
 * Broadcasts an event to all admins viewing the ticket queue.
 * 
 * @param {string} eventName - e.g. 'ticket_created', 'ticket_updated'
 * @param {object} payload - Data payload
 */
export const broadcastQueueUpdate = (eventName, payload) => {
  if (queueSubscribers.size === 0) return;

  const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  queueSubscribers.forEach((adminRes) => {
    try {
      adminRes.write(message);
    } catch (err) {
      console.warn('⚠️ Error sending SSE to queue subscriber:', err.message);
    }
  });
};