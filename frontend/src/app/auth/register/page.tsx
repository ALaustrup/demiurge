'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Text,
  Link,
  Alert,
  AlertIcon,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { useAuthStore } from '@/store/authStore';
import api from '@/utils/api';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
      });
      setAuth(response.data.user, response.data.token);
      router.push('/gallery');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" position="relative" overflow="hidden">
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgGradient="radial(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial(circle at 80% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)"
        pointerEvents="none"
      />
      <Container maxW="md" position="relative" zIndex={1}>
        <Card>
          <CardBody>
            <VStack spacing={6}>
              <Box textAlign="center">
                <Heading as="h1" size="2xl" fontFamily="heading" bgGradient="linear(to-r, #8b5cf6, #ec4899)" bgClip="text">
                  CREATE ACCOUNT
                </Heading>
                <Text color="gray.400" mt={2} fontFamily="body">
                  Join Demiurge and start creating NFTs
                </Text>
              </Box>

              {error && (
                <Alert status="error" bg="rgba(236, 72, 153, 0.1)" borderColor="neon.pink">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <Box w="100%" as="form" onSubmit={handleSubmit}>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel color="gray.300" fontFamily="body">Username</FormLabel>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      bg="rgba(26, 26, 46, 0.8)"
                      borderColor="cyber.500"
                      _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel color="gray.300" fontFamily="body">Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      bg="rgba(26, 26, 46, 0.8)"
                      borderColor="cyber.500"
                      _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel color="gray.300" fontFamily="body">Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      bg="rgba(26, 26, 46, 0.8)"
                      borderColor="cyber.500"
                      _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                    />
                  </FormControl>

                  <Button
                    type="submit"
                    variant="cyber"
                    size="lg"
                    w="100%"
                    isLoading={loading}
                    fontFamily="heading"
                  >
                    SIGN UP
                  </Button>
                </VStack>
              </Box>

              <Text color="gray.400" fontFamily="body">
                Already have an account?{' '}
                <Link href="/auth/login" color="neon.green" _hover={{ textShadow: '0 0 5px #00ff88' }}>
                  Login
                </Link>
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
