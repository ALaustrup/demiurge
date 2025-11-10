'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  Input,
  Button,
  Text,
  HStack,
  Card,
  CardBody,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/utils/socket';
import api from '@/utils/api';

export default function ChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [privateMessages, setPrivateMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [privateRecipient, setPrivateRecipient] = useState('');
  const [privateMessage, setPrivateMessage] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const privateMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    socket.emit('join-global-chat');
    socket.emit('join-user-room', user.id);

    socket.on('receive-global-message', (data: any) => {
      setMessages((prev) => [...prev, { ...data, type: 'global' }]);
    });

    socket.on('receive-private-message', (data: any) => {
      setPrivateMessages((prev) => [...prev, { ...data, type: 'private' }]);
    });

    // Load chat history
    loadChatHistory();

    return () => {
      socket.emit('leave-global-chat');
      socket.off('receive-global-message');
      socket.off('receive-private-message');
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    privateMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [privateMessages]);

  const loadChatHistory = async () => {
    try {
      const response = await api.get('/chat/history?isGlobal=true');
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendGlobalMessage = () => {
    if (!inputMessage.trim() || !user) return;

    const socket = getSocket();
    socket.emit('send-global-message', {
      userId: user.id,
      username: user.username,
      message: inputMessage,
    });
    setInputMessage('');
  };

  const sendPrivateMessage = async () => {
    if (!privateMessage.trim() || !privateRecipient || !user) return;

    try {
      await api.post('/chat/private', {
        toUserId: parseInt(privateRecipient),
        message: privateMessage,
      });
      setPrivateMessage('');
    } catch (error) {
      console.error('Error sending private message:', error);
    }
  };

  if (!user) {
    return (
      <Container maxW="container.xl" py={10}>
        <Box textAlign="center">
          <Text fontSize="xl" color="gray.400">Please login to use chat</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" fontFamily="heading" bgGradient="linear(to-r, #8b5cf6, #ec4899)" bgClip="text">
            CHAT
          </Heading>
          <Text color="gray.400" mt={2} fontFamily="body">
            Connect with the Demiurge community
          </Text>
        </Box>

        <Tabs colorScheme="purple">
          <TabList>
            <Tab fontFamily="body">GLOBAL CHAT</Tab>
            <Tab fontFamily="body">PRIVATE MESSAGES</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Card h="500px">
                <CardBody>
                  <VStack
                    h="100%"
                    align="stretch"
                    spacing={4}
                    overflowY="auto"
                    pb={4}
                  >
                    {messages.length === 0 ? (
                      <Text color="gray.500" textAlign="center" mt={10} fontFamily="body">
                        No messages yet. Start chatting!
                      </Text>
                    ) : (
                      messages.map((msg, idx) => (
                        <Box
                          key={idx}
                          alignSelf={
                            msg.userId === user.id ? 'flex-end' : 'flex-start'
                          }
                          bg={
                            msg.userId === user.id
                              ? 'rgba(139, 92, 246, 0.3)'
                              : 'rgba(26, 26, 46, 0.8)'
                          }
                          border="1px solid"
                          borderColor={msg.userId === user.id ? 'cyber.500' : 'gray.600'}
                          p={3}
                          borderRadius="md"
                          maxW="70%"
                        >
                          <HStack spacing={2} mb={1}>
                            <Text fontSize="xs" color="neon.green" fontFamily="heading" fontWeight="bold">
                              {msg.username || msg.fromUsername}
                            </Text>
                            {msg.userId === user.id && (
                              <Badge colorScheme="purple" fontSize="xs" fontFamily="body">YOU</Badge>
                            )}
                          </HStack>
                          <Text color="gray.200" fontFamily="body">{msg.message}</Text>
                          <Text fontSize="xs" color="gray.500" mt={1} fontFamily="body">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </Text>
                        </Box>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </VStack>
                </CardBody>
              </Card>
              <HStack>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendGlobalMessage()}
                  placeholder="Type a global message..."
                  bg="rgba(26, 26, 46, 0.8)"
                  borderColor="cyber.500"
                  _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                />
                <Button variant="cyber" onClick={sendGlobalMessage} fontFamily="heading">
                  SEND
                </Button>
              </HStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Input
                  placeholder="Enter user ID to message..."
                  value={privateRecipient}
                  onChange={(e) => setPrivateRecipient(e.target.value)}
                  bg="rgba(26, 26, 46, 0.8)"
                  borderColor="cyber.500"
                />
                <Card h="400px">
                  <CardBody>
                    <VStack
                      h="100%"
                      align="stretch"
                      spacing={4}
                      overflowY="auto"
                      pb={4}
                    >
                      {privateMessages.length === 0 ? (
                        <Text color="gray.500" textAlign="center" mt={10} fontFamily="body">
                          No private messages yet
                        </Text>
                      ) : (
                        privateMessages.map((msg, idx) => (
                          <Box
                            key={idx}
                            alignSelf={
                              msg.fromUserId === user.id ? 'flex-end' : 'flex-start'
                            }
                            bg={
                              msg.fromUserId === user.id
                                ? 'rgba(139, 92, 246, 0.3)'
                                : 'rgba(26, 26, 46, 0.8)'
                            }
                            border="1px solid"
                            borderColor={msg.fromUserId === user.id ? 'cyber.500' : 'gray.600'}
                            p={3}
                            borderRadius="md"
                            maxW="70%"
                          >
                            <Text fontSize="xs" color="neon.cyan" fontFamily="heading" mb={1}>
                              {msg.fromUsername || 'Unknown'}
                            </Text>
                            <Text color="gray.200" fontFamily="body">{msg.message}</Text>
                            <Text fontSize="xs" color="gray.500" mt={1} fontFamily="body">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </Text>
                          </Box>
                        ))
                      )}
                      <div ref={privateMessagesEndRef} />
                    </VStack>
                  </CardBody>
                </Card>
                <HStack>
                  <Input
                    value={privateMessage}
                    onChange={(e) => setPrivateMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendPrivateMessage()}
                    placeholder="Type a private message..."
                    bg="rgba(26, 26, 46, 0.8)"
                    borderColor="cyber.500"
                    _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                  />
                  <Button
                    variant="cyber"
                    onClick={sendPrivateMessage}
                    fontFamily="heading"
                    isDisabled={!privateRecipient}
                  >
                    SEND
                  </Button>
                </HStack>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}
