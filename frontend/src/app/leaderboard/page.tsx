'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  Text,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import api from '@/utils/api';

interface LeaderboardEntry {
  id: number;
  username: string;
  bits: number;
  socialScore: number;
  socialTier: string;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('social_score');

  useEffect(() => {
    fetchLeaderboard();
  }, [type]);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get(`/user/leaderboard?type=${type}&limit=100`);
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: { [key: string]: string } = {
      bronze: 'orange',
      silver: 'gray',
      gold: 'yellow',
      platinum: 'blue',
      diamond: 'purple',
    };
    return colors[tier] || 'gray';
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" color="neon.green" />
          <Text>Loading leaderboard...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" fontFamily="heading" bgGradient="linear(to-r, #8b5cf6, #ec4899)" bgClip="text">
            LEADERBOARD
          </Heading>
          <Text color="gray.400" mt={2}>
            Top performers in the Demiurge metaverse
          </Text>
        </Box>

        <Tabs onChange={(index) => setType(index === 0 ? 'social_score' : 'bits')} colorScheme="purple">
          <TabList>
            <Tab fontFamily="body">SOCIAL SCORE</Tab>
            <Tab fontFamily="body">BITS</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Card>
                <CardBody>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th color="gray.400" fontFamily="body">RANK</Th>
                        <Th color="gray.400" fontFamily="body">USERNAME</Th>
                        <Th color="gray.400" fontFamily="body">SOCIAL SCORE</Th>
                        <Th color="gray.400" fontFamily="body">TIER</Th>
                        <Th color="gray.400" fontFamily="body">BITS</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {leaderboard.map((entry, index) => (
                        <Tr key={entry.id} _hover={{ bg: 'rgba(139, 92, 246, 0.1)' }}>
                          <Td fontFamily="heading" color={index < 3 ? 'neon.green' : 'gray.300'}>
                            #{index + 1}
                          </Td>
                          <Td fontFamily="body" color="gray.300">{entry.username}</Td>
                          <Td fontFamily="heading" color="neon.cyan">{entry.socialScore.toLocaleString()}</Td>
                          <Td>
                            <Badge colorScheme={getTierColor(entry.socialTier)} fontFamily="body">
                              {entry.socialTier.toUpperCase()}
                            </Badge>
                          </Td>
                          <Td fontFamily="body" color="gray.300">{entry.bits.toLocaleString()}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </TabPanel>
            <TabPanel>
              <Card>
                <CardBody>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th color="gray.400" fontFamily="body">RANK</Th>
                        <Th color="gray.400" fontFamily="body">USERNAME</Th>
                        <Th color="gray.400" fontFamily="body">BITS</Th>
                        <Th color="gray.400" fontFamily="body">SOCIAL SCORE</Th>
                        <Th color="gray.400" fontFamily="body">TIER</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {leaderboard.map((entry, index) => (
                        <Tr key={entry.id} _hover={{ bg: 'rgba(139, 92, 246, 0.1)' }}>
                          <Td fontFamily="heading" color={index < 3 ? 'neon.green' : 'gray.300'}>
                            #{index + 1}
                          </Td>
                          <Td fontFamily="body" color="gray.300">{entry.username}</Td>
                          <Td fontFamily="heading" color="neon.green">{entry.bits.toLocaleString()}</Td>
                          <Td fontFamily="body" color="gray.300">{entry.socialScore.toLocaleString()}</Td>
                          <Td>
                            <Badge colorScheme={getTierColor(entry.socialTier)} fontFamily="body">
                              {entry.socialTier.toUpperCase()}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}

