'use client';

import { HStack, Button, Box, Text, Badge } from '@chakra-ui/react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <Box
      bg="rgba(10, 10, 15, 0.95)"
      backdropFilter="blur(10px)"
      borderBottom="1px solid"
      borderColor="cyber.500"
      py={4}
      px={8}
      position="sticky"
      top={0}
      zIndex={1000}
      boxShadow="0 0 20px rgba(139, 92, 246, 0.3)"
    >
      <HStack justify="space-between">
        <HStack spacing={8}>
          <Link href="/">
            <Text
              fontSize="xl"
              fontWeight="bold"
              cursor="pointer"
              fontFamily="heading"
              bgGradient="linear(to-r, #8b5cf6, #ec4899)"
              bgClip="text"
              _hover={{
                textShadow: '0 0 10px rgba(139, 92, 246, 0.5)',
              }}
            >
              ⚡ DEMIURGE
            </Text>
          </Link>
          <HStack spacing={6}>
            <Link href="/gallery" style={{ textDecoration: 'none' }}>
              <Text
                cursor="pointer"
                color="gray.300"
                _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
                transition="all 0.3s"
              >
                GALLERY
              </Text>
            </Link>
            <Link href="/marketplace" style={{ textDecoration: 'none' }}>
              <Text
                cursor="pointer"
                color="gray.300"
                _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
                transition="all 0.3s"
              >
                MARKETPLACE
              </Text>
            </Link>
            <Link href="/battles" style={{ textDecoration: 'none' }}>
              <Text
                cursor="pointer"
                color="gray.300"
                _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
                transition="all 0.3s"
              >
                BATTLES
              </Text>
            </Link>
            <Link href="/chat" style={{ textDecoration: 'none' }}>
              <Text
                cursor="pointer"
                color="gray.300"
                _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
                transition="all 0.3s"
              >
                CHAT
              </Text>
            </Link>
            <Link href="/leaderboard" style={{ textDecoration: 'none' }}>
              <Text
                cursor="pointer"
                color="gray.300"
                _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
                transition="all 0.3s"
              >
                LEADERBOARD
              </Text>
            </Link>
            {user && (
              <Link href="/create" style={{ textDecoration: 'none' }}>
                <Text
                  cursor="pointer"
                  color="gray.300"
                  _hover={{ color: '#00ff88', textShadow: '0 0 5px #00ff88' }}
                  transition="all 0.3s"
                >
                  CREATE
                </Text>
              </Link>
            )}
          </HStack>
        </HStack>
        <HStack spacing={4}>
          {user ? (
            <>
              <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>
                {user.bits} BITS
              </Badge>
              <Link href="/profile">
                <Button variant="neon" size="sm">
                  {user.username}
                </Button>
              </Link>
              <Button variant="neon" size="sm" onClick={handleLogout}>
                LOGOUT
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="neon" size="sm">
                  LOGIN
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="cyber" size="sm">
                  SIGN UP
                </Button>
              </Link>
            </>
          )}
        </HStack>
      </HStack>
    </Box>
  );
}

