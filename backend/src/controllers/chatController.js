const { getIO } = require('../config/socket');
const mongoose = require('mongoose');

// Chat message schema (using MongoDB)
const chatMessageSchema = new mongoose.Schema({
  fromUserId: { type: Number, required: true },
  toUserId: { type: Number, required: true },
  message: { type: String, required: true },
  isGlobal: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

/**
 * Send private message
 */
const sendPrivateMessage = async (req, res) => {
  try {
    const { toUserId, message } = req.body;

    if (!toUserId || !message) {
      return res.status(400).json({ message: 'Recipient ID and message are required' });
    }

    // Save message to database
    const chatMessage = new ChatMessage({
      fromUserId: req.user.id,
      toUserId,
      message,
      isGlobal: false,
    });

    await chatMessage.save();

    // Send via Socket.IO
    const io = getIO();
    io.to(`user-${toUserId}`).emit('receive-private-message', {
      fromUserId: req.user.id,
      fromUsername: req.user.username,
      message,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: 'Message sent successfully',
      chatMessage: {
        id: chatMessage._id,
        fromUserId: chatMessage.fromUserId,
        toUserId: chatMessage.toUserId,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp,
      },
    });
  } catch (error) {
    console.error('Send private message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

/**
 * Send global message
 */
const sendGlobalMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Save message to database
    const chatMessage = new ChatMessage({
      fromUserId: req.user.id,
      toUserId: 0, // Global message
      message,
      isGlobal: true,
    });

    await chatMessage.save();

    // Send via Socket.IO
    const io = getIO();
    io.to('global-chat').emit('receive-global-message', {
      userId: req.user.id,
      username: req.user.username,
      message,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: 'Global message sent successfully',
      chatMessage: {
        id: chatMessage._id,
        fromUserId: chatMessage.fromUserId,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp,
      },
    });
  } catch (error) {
    console.error('Send global message error:', error);
    res.status(500).json({ message: 'Failed to send global message' });
  }
};

/**
 * Get chat history
 */
const getChatHistory = async (req, res) => {
  try {
    const { otherUserId, isGlobal } = req.query;

    let query = {};

    if (isGlobal === 'true') {
      query = { isGlobal: true };
    } else if (otherUserId) {
      query = {
        $or: [
          { fromUserId: req.user.id, toUserId: parseInt(otherUserId) },
          { fromUserId: parseInt(otherUserId), toUserId: req.user.id },
        ],
        isGlobal: false,
      };
    } else {
      query = {
        $or: [{ fromUserId: req.user.id }, { toUserId: req.user.id }],
        isGlobal: false,
      };
    }

    const messages = await ChatMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({
      messages: messages.reverse(), // Return in chronological order
      count: messages.length,
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Failed to get chat history' });
  }
};

module.exports = {
  sendPrivateMessage,
  sendGlobalMessage,
  getChatHistory,
};

