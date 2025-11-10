'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
  Image,
  Text,
  VStack,
  Spinner,
  Button,
  Badge,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  useToast,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface Listing {
  id: number;
  nft_id: number;
  price: string;
  name: string;
  description: string;
  media_url: string;
  media_type: string;
  battle_power: number;
  level: number;
  seller_username: string;
}

export default function MarketplacePage() {
  const { user } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('price-low');
  const toast = useToast();

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterAndSortListings();
  }, [listings, searchQuery, sortBy]);

  const fetchListings = async () => {
    try {
      const response = await api.get('/marketplace/listings?limit=100');
      setListings(response.data.listings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortListings = () => {
    let filtered = [...listings];

    if (searchQuery) {
      filtered = filtered.filter(
        (listing) =>
          listing.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const priceA = parseFloat(a.price);
      const priceB = parseFloat(b.price);
      switch (sortBy) {
        case 'price-low':
          return priceA - priceB;
        case 'price-high':
          return priceB - priceA;
        case 'power':
          return (b.battle_power || 0) - (a.battle_power || 0);
        case 'level':
          return (b.level || 0) - (a.level || 0);
        default:
          return 0;
      }
    });

    setFilteredListings(filtered);
  };

  const handleBuy = async (listingId: number, price: string) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to purchase NFTs',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (window.confirm(`Purchase this NFT for ${price} Bits?`)) {
      try {
        await api.post('/marketplace/buy', { listingId });
        toast({
          title: 'Purchase Successful!',
          description: 'NFT purchased successfully',
          status: 'success',
          duration: 3000,
        });
        fetchListings();
      } catch (error: any) {
        toast({
          title: 'Purchase Failed',
          description: error.response?.data?.message || 'Insufficient Bits',
          status: 'error',
          duration: 3000,
        });
      }
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" color="neon.green" />
          <Text color="gray.400">Loading marketplace...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" fontFamily="heading" bgGradient="linear(to-r, #8b5cf6, #ec4899)" bgClip="text">
            MARKETPLACE
          </Heading>
          <Text color="gray.400" mt={2} fontFamily="body">
            Buy and sell NFTs on the blockchain
          </Text>
        </Box>

        {/* Filters */}
        <Card>
          <CardBody>
            <HStack spacing={4} flexWrap="wrap">
              <InputGroup flex="1" minW="200px">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  bg="rgba(26, 26, 46, 0.8)"
                  borderColor="cyber.500"
                  _focus={{ borderColor: 'neon.green', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }}
                />
              </InputGroup>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                w="200px"
                bg="rgba(26, 26, 46, 0.8)"
                borderColor="cyber.500"
              >
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="power">Battle Power</option>
                <option value="level">Level</option>
              </Select>
            </HStack>
          </CardBody>
        </Card>

        {filteredListings.length === 0 ? (
          <Box textAlign="center" py={20}>
            <Text fontSize="xl" color="gray.400">
              No listings available
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={6}>
            {filteredListings.map((listing) => (
              <Card
                key={listing.id}
                _hover={{
                  transform: 'translateY(-5px)',
                  boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
                }}
                transition="all 0.3s"
              >
                <Box
                  h="250px"
                  bg="rgba(26, 26, 46, 0.5)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  overflow="hidden"
                  position="relative"
                >
                  {listing.media_type === 'image' ? (
                    <Image
                      src={listing.media_url}
                      alt={listing.name}
                      maxH="100%"
                      maxW="100%"
                      objectFit="cover"
                    />
                  ) : (
                    <VStack>
                      <Text fontSize="4xl">
                        {listing.media_type === 'video' ? '🎬' : '🎵'}
                      </Text>
                      <Text color="gray.400" fontSize="sm" fontFamily="body">
                        {listing.media_type?.toUpperCase() || 'MEDIA'}
                      </Text>
                    </VStack>
                  )}
                  <Badge
                    position="absolute"
                    top={2}
                    right={2}
                    colorScheme="purple"
                    fontFamily="body"
                  >
                    Lv.{listing.level}
                  </Badge>
                </Box>
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <Heading as="h3" size="md" fontFamily="heading" color="neon.green" noOfLines={1}>
                      {listing.name}
                    </Heading>
                    <Text fontSize="sm" color="gray.400" noOfLines={2} fontFamily="body">
                      {listing.description}
                    </Text>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="xs" color="gray.500" fontFamily="body">
                          Power
                        </Text>
                        <Text fontSize="sm" color="neon.cyan" fontFamily="heading">
                          {listing.battle_power}
                        </Text>
                      </VStack>
                      <Badge colorScheme="green" fontSize="lg" px={3} py={1} fontFamily="heading">
                        {parseFloat(listing.price).toFixed(2)} BITS
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" fontFamily="body">
                      Seller: {listing.seller_username}
                    </Text>
                    <Button
                      variant="cyber"
                      onClick={() => handleBuy(listing.id, listing.price)}
                      fontFamily="heading"
                      isDisabled={!user}
                    >
                      BUY NOW
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}
