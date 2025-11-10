"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Spinner,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Heading,
  useToast,
} from "@chakra-ui/react";
import { useAuthStore } from "@/store/authStore";
import { useHeroStore } from "@/store/heroStore";
import { getMyParty, startEncounter, PartyMember, RpgEncounterPayload } from "@/utils/rpgApi";
import { Overworld } from "@/components/rpg/Overworld";

export default function RpgPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { hero } = useHeroStore();
  const [party, setParty] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [encounterData, setEncounterData] = useState<RpgEncounterPayload | null>(null);
  const [isEncountering, setIsEncountering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    async function loadParty() {
      try {
        const p = await getMyParty();
        setParty(p);
      } catch (err) {
        console.error(err);
        setError("Failed to load party.");
      } finally {
        setLoading(false);
      }
    }

    loadParty();
  }, [user, router]);

  async function handleEncounterTrigger() {
    if (isEncountering || encounterData) return;

    if (!party || party.length === 0) {
      setError("You have no battle-ready NFTs. Create or acquire some first.");
      toast({
        title: "No Party Members",
        description: "You need at least one NFT to battle.",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      setIsEncountering(true);
      setError(null);

      // Use the first party member as attacker
      const attacker = party[0];
      const data = await startEncounter(attacker.id);
      setEncounterData(data);

      // Show toast based on result
      if (data.winner === "player") {
        toast({
          title: "Victory!",
          description: `Gained ${data.xpGained} XP and ${data.bitsReward} Bits`,
          status: "success",
          duration: 5000,
        });
      } else {
        toast({
          title: "Defeated",
          description: "You gained experience from the battle.",
          status: "info",
          duration: 3000,
        });
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.message || "Failed to start encounter.";
      setError(errorMsg);
      toast({
        title: "Encounter Failed",
        description: errorMsg,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsEncountering(false);
    }
  }

  function handleCloseBattle() {
    setEncounterData(null);
    // Reload party to get updated stats
    getMyParty().then(setParty).catch(console.error);
  }

  function getEffectivenessText(effectiveness: number): string {
    if (effectiveness >= 2) return "Super effective!";
    if (effectiveness <= 0.5) return "Not very effective...";
    return "";
  }

  function getEffectivenessColor(effectiveness: number): string {
    if (effectiveness >= 2) return "neon.green";
    if (effectiveness <= 0.5) return "gray.400";
    return "gray.300";
  }

  function getAffinityColor(affinity: string): string {
    const colors: Record<string, string> = {
      fire: "red",
      water: "blue",
      bio: "green",
      tech: "cyan",
      void: "purple",
      neutral: "gray",
    };
    return colors[affinity] || "gray";
  }

  if (!user) {
    return (
      <Container maxW="container.xl" py={10}>
        <Box textAlign="center">
          <Text fontSize="xl" color="gray.400" mb={4}>
            You must be logged in to access the RPG mode.
          </Text>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxW="container.xl" py={10}>
        <VStack spacing={4}>
          <Spinner size="xl" color="neon.green" />
          <Text color="gray.400">Loading RPG...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Box minH="calc(100vh - 4rem)" bg="rgba(15, 15, 25, 0.95)" color="gray.100">
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <Box>
              <Heading as="h1" size="2xl" fontFamily="heading" bgGradient="linear(to-r, #8b5cf6, #ec4899)" bgClip="text">
                RPG MODE
              </Heading>
              <Text color="gray.400" mt={1} fontFamily="body">
                Explore the overworld and battle wild encounters
              </Text>
            </Box>
            {hero && (
              <Badge colorScheme="purple" fontSize="md" px={3} py={1} fontFamily="heading">
                Hero: {hero.name}
              </Badge>
            )}
          </HStack>

          {/* Main Content */}
          <HStack spacing={6} align="stretch" h="calc(100vh - 12rem)">
            {/* Overworld Area */}
            <Box flex={1} border="1px solid" borderColor="cyber.500" borderRadius="xl" p={4} bg="rgba(26, 26, 46, 0.6)">
              <Heading as="h2" size="md" fontFamily="heading" color="neon.cyan" mb={3}>
                OVERWORLD
              </Heading>
              <Overworld onEncounter={handleEncounterTrigger} disabled={!!encounterData || isEncountering} />
            </Box>

            {/* Side HUD */}
            <Box w="320px" border="1px solid" borderColor="cyber.500" borderRadius="xl" p={4} bg="rgba(26, 26, 46, 0.6)">
              <VStack spacing={4} align="stretch">
                {/* Party Section */}
                <Box>
                  <Heading as="h3" size="sm" fontFamily="heading" color="neon.cyan" mb={3}>
                    PARTY
                  </Heading>
                  {party.length === 0 ? (
                    <Box p={4} bg="rgba(139, 92, 246, 0.1)" borderRadius="md" border="1px solid" borderColor="purple.500">
                      <Text fontSize="sm" color="gray.400" textAlign="center">
                        You have no battle-ready NFTs yet. Create or acquire an NFT to fight in encounters.
                      </Text>
                    </Box>
                  ) : (
                    <VStack spacing={2} align="stretch">
                      {party.map((m) => (
                        <Box
                          key={m.id}
                          p={3}
                          bg="rgba(139, 92, 246, 0.1)"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="purple.500"
                        >
                          <HStack justify="space-between" mb={1}>
                            <Text fontFamily="heading" fontSize="sm" color="neon.green">
                              {m.name || `NFT #${m.id}`}
                            </Text>
                            <Badge colorScheme={getAffinityColor(m.affinity)} fontSize="xs">
                              {m.affinity}
                            </Badge>
                          </HStack>
                          <HStack spacing={2} fontSize="xs" color="gray.400" fontFamily="mono">
                            <Text>Lv {m.level}</Text>
                            <Text>•</Text>
                            <Text>HP {m.hp}</Text>
                            <Text>•</Text>
                            <Text>XP {m.experience}</Text>
                          </HStack>
                          <HStack spacing={2} mt={1} fontSize="xs" color="gray.500" fontFamily="mono">
                            <Text>ATK {m.attack}</Text>
                            <Text>DEF {m.defense}</Text>
                            <Text>SPD {m.speed}</Text>
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  )}
                </Box>

                {/* Status Section */}
                <Box>
                  <Heading as="h3" size="sm" fontFamily="heading" color="neon.cyan" mb={3}>
                    STATUS
                  </Heading>
                  <Box p={3} bg="rgba(139, 92, 246, 0.1)" borderRadius="md" border="1px solid" borderColor="purple.500">
                    <Text fontSize="xs" color="gray.400" fontFamily="body">
                      Walk around the overworld to trigger{" "}
                      <Text as="span" color="neon.cyan" fontFamily="heading">
                        wild encounters
                      </Text>
                      .
                    </Text>
                  </Box>
                </Box>

                {/* Error Display */}
                {error && (
                  <Box p={3} bg="rgba(239, 68, 68, 0.1)" borderRadius="md" border="1px solid" borderColor="red.500">
                    <Text fontSize="xs" color="red.200">
                      {error}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Box>
          </HStack>
        </VStack>
      </Container>

      {/* Battle Result Modal */}
      {encounterData && (
        <Modal isOpen={!!encounterData} onClose={handleCloseBattle} size="xl" isCentered>
          <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
          <ModalContent bg="rgba(26, 26, 46, 0.95)" border="1px solid" borderColor="cyber.500">
            <ModalHeader fontFamily="heading" color={encounterData.winner === "player" ? "neon.green" : "neon.pink"}>
              {encounterData.winner === "player" ? "VICTORY!" : "DEFEATED"}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4} align="stretch">
                {/* Battle Summary */}
                <Box p={4} bg="rgba(139, 92, 246, 0.1)" borderRadius="md" border="1px solid" borderColor="purple.500">
                  <HStack justify="space-between" mb={2}>
                    <VStack align="start" spacing={1}>
                      <Text fontFamily="heading" fontSize="sm" color="neon.green">
                        {encounterData.attacker.name}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        Lv {encounterData.attacker.level} • {encounterData.attacker.affinity}
                      </Text>
                    </VStack>
                    <Text fontFamily="heading" fontSize="lg" color="neon.pink">
                      VS
                    </Text>
                    <VStack align="end" spacing={1}>
                      <Text fontFamily="heading" fontSize="sm" color="neon.pink">
                        {encounterData.defender.name}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        Lv {encounterData.defender.level} • {encounterData.defender.affinity}
                      </Text>
                    </VStack>
                  </HStack>
                  {encounterData.winner === "player" && (
                    <HStack spacing={4} mt={3} fontSize="sm" color="neon.green">
                      <Text>+{encounterData.xpGained} XP</Text>
                      <Text>+{encounterData.bitsReward} Bits</Text>
                    </HStack>
                  )}
                </Box>

                {/* Battle Log */}
                <Box>
                  <Heading as="h3" size="sm" fontFamily="heading" color="neon.cyan" mb={3}>
                    BATTLE LOG
                  </Heading>
                  <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
                    {encounterData.turns.map((turn, idx) => {
                      const isAttackerTurn = turn.actingNftId === encounterData.attacker.id;
                      const effectivenessText = getEffectivenessText(turn.effectiveness);

                      return (
                        <Box
                          key={idx}
                          p={3}
                          bg="rgba(139, 92, 246, 0.1)"
                          borderRadius="md"
                          borderLeft="3px solid"
                          borderLeftColor={isAttackerTurn ? "neon.green" : "neon.pink"}
                        >
                          <HStack justify="space-between" flexWrap="wrap">
                            <VStack align="start" spacing={1}>
                              <Text fontFamily="body" fontSize="xs" color="gray.300">
                                <strong>Turn {turn.turnNumber}</strong>
                              </Text>
                              <Text fontFamily="body" fontSize="xs" color={isAttackerTurn ? "neon.green" : "neon.pink"}>
                                {isAttackerTurn ? encounterData.attacker.name : encounterData.defender.name} used{" "}
                                <strong>{turn.moveName || "Move"}</strong>
                              </Text>
                              {turn.damageDone > 0 ? (
                                <HStack spacing={2}>
                                  <Text fontFamily="body" fontSize="xs" color="gray.300">
                                    → {turn.damageDone} damage
                                  </Text>
                                  {turn.crit && (
                                    <Badge colorScheme="red" fontSize="xs">
                                      CRIT!
                                    </Badge>
                                  )}
                                  {effectivenessText && (
                                    <Text
                                      fontFamily="body"
                                      fontSize="xs"
                                      color={getEffectivenessColor(turn.effectiveness)}
                                    >
                                      {effectivenessText}
                                    </Text>
                                  )}
                                </HStack>
                              ) : (
                                <Text fontFamily="body" fontSize="xs" color="gray.500">
                                  Missed!
                                </Text>
                              )}
                            </VStack>
                            <VStack align="end" spacing={1}>
                              <Text fontFamily="mono" fontSize="xs" color="gray.400">
                                Player HP: {turn.attackerHpAfter}
                              </Text>
                              <Text fontFamily="mono" fontSize="xs" color="gray.400">
                                Enemy HP: {turn.defenderHpAfter}
                              </Text>
                            </VStack>
                          </HStack>
                        </Box>
                      );
                    })}
                  </VStack>
                </Box>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}

