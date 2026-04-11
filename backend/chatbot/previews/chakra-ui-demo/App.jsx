import React, { useState } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  Checkbox,
  Switch,
  Slider,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Badge,
  Avatar,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Divider,
  IconButton,
  Tooltip,
  Wrap,
  WrapItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Flex,
  Container,
  extendTheme,
} from '@chakra-ui/react';
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
    },
  },
  colors: {
    brand: {
      50: '#e6f2ff',
      100: '#b3d9ff',
      500: '#3182ce',
      600: '#2b6cb0',
      700: '#1a4971',
    },
  },
});
const ChakraDemo = () => {
  const [inputValue, setInputValue] = useState('');
const [sliderValue, setSliderValue] = useState(50);
const [isLoading, setIsLoading] = useState(false);
const { isOpen, onOpen, onClose } = useDisclosure();
const toast = useToast();
const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Success!',
        description: `Submitted: ${inputValue}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }, 1500);
  };
const showAlert = (type) => {
    toast({
      title: `${type} Alert`,
      status: type.toLowerCase(),
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center" py={8}>
          <Heading as="h1" size="2xl" color="brand.600" mb={4}>
            🎨 Chakra UI Demo
          </Heading>
          <Text fontSize="lg" color="gray.600">
            A comprehensive showcase of Chakra UI components
          </Text>
        </Box>

        {/* Alert Examples */}
        <Box>
          <Heading size="md" mb={4}>Alerts</Heading>
          <VStack spacing={3}>
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Info</AlertTitle>
                <AlertDescription>This is an informational alert.</AlertDescription>
              </Box>
            </Alert>
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>Operation completed successfully!</AlertDescription>
              </Box>
            </Alert>
          </VStack>
        </Box>

        <Divider />

        {/* Input & Form Components */}
        <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
          <Heading size="md" mb={4}>Form Components</Heading>
          <VStack spacing={4}>
            <HStack w="full">
              <Input
                placeholder="Enter your name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                size="lg"
              />
              <Button
                colorScheme="brand"
                onClick={handleSubmit}
                isLoading={isLoading}
                loadingText="Submitting"
                size="lg"
              >
                Submit
              </Button>
            </HStack>

            <HStack w="full">
              <Input type="password" placeholder="Password" />
              <Select placeholder="Select option">
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </Select>
            </HStack>

            <HStack w="full">
              <Text>Slider Value: {sliderValue}</Text>
              <Slider
                value={sliderValue}
                onChange={setSliderValue}
                min={0}
                max={100}
                colorScheme="brand"
              >
                <Slider.Track>
                  <Slider.FilledTrack />
                </Slider.Track>
                <Slider.Thumb />
              </Slider>
            </HStack>

            <HStack>
              <Checkbox colorScheme="brand">I agree to terms</Checkbox>
              <Switch colorScheme="brand" defaultChecked>
                Enable notifications
              </Switch>
            </HStack>
          </VStack>
        </Box>

        <Divider />

        {/* Cards & Stats */}
        <Box>
          <Heading size="md" mb={4}>Cards & Statistics</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Card>
              <CardHeader>
                <Heading size="sm">Total Users</Heading>
              </CardHeader>
              <CardBody>
                <Stat>
                  <StatNumber>1,234</StatNumber>
                  <StatHelpText color="green.500">↑ 12% from last month</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <Heading size="sm">Revenue</Heading>
              </CardHeader>
              <CardBody>
                <Stat>
                  <StatNumber>$45,678</StatNumber>
                  <StatHelpText color="green.500">↑ 8% from last month</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <Heading size="sm">Active Sessions</Heading>
              </CardHeader>
              <CardBody>
                <Stat>
                  <StatNumber>567</StatNumber>
                  <StatHelpText color="red.500">↓ 3% from last hour</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <Heading size="sm">Conversion Rate</Heading>
              </CardHeader>
              <CardBody>
                <Stat>
                  <StatNumber>23.4%</StatNumber>
                  <StatHelpText color="green.500">↑ 5% from last week</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Tabs & Menu */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
            <Heading size="md" mb={4}>Tabs</Heading>
            <Tabs colorScheme="brand" isFitted variant="enclosed">
              <TabList mb="1em">
                <Tab>Profile</Tab>
                <Tab>Settings</Tab>
                <Tab>Security</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <VStack align="start" spacing={3}>
                    <Text>👤 Profile Information</Text>
                    <Progress value={80} colorScheme="brand" borderRadius="full" />
                    <Text fontSize="sm" color="gray.500">80% Complete</Text>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <Text>⚙️ App Settings</Text>
                  <VStack mt={4} align="start">
                    <Switch colorScheme="brand">Dark Mode</Switch>
                    <Switch colorScheme="brand">Auto-save</Switch>
                    <Switch colorScheme="brand">Analytics</Switch>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <Text>🔒 Security Options</Text>
                  <VStack mt={4} align="start">
                    <Badge colorScheme="green">2FA Enabled</Badge>
                    <Badge colorScheme="yellow">Password: Strong</Badge>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>

          <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
            <Heading size="md" mb={4}>Menu & Actions</Heading>
            <VStack spacing={4}>
              <Menu>
                <MenuButton as={Button} colorScheme="brand">
                  Actions ▼
                </MenuButton>
                <MenuList>
                  <MenuItem>📝 Edit Profile</MenuItem>
                  <MenuItem>📊 View Analytics</MenuItem>
                  <MenuItem>⚙️ Settings</MenuItem>
                  <MenuItem color="red.500">🚪 Logout</MenuItem>
                </MenuList>
              </Menu>

              <HStack spacing={4}>
                <Tooltip label="Refresh data" hasArrow>
                  <IconButton
                    icon={<Text>🔄</Text>}
                    colorScheme="blue"
                    aria-label="Refresh"
                    onClick={() => showAlert('info')}
                  />
                </Tooltip>
                <Tooltip label="Download report" hasArrow>
                  <IconButton
                    icon={<Text>📥</Text>}
                    colorScheme="green"
                    aria-label="Download"
                    onClick={() => showAlert('success')}
                  />
                </Tooltip>
                <Tooltip label="Delete item" hasArrow>
                  <IconButton
                    icon={<Text>🗑️</Text>}
                    colorScheme="red"
                    aria-label="Delete"
                    onClick={() => showAlert('error')}
                  />
                </Tooltip>
              </HStack>

              <Wrap>
                <WrapItem>
                  <Badge colorScheme="purple" fontSize="md" p={2}>
                    React
                  </Badge>
                </WrapItem>
                <WrapItem>
                  <Badge colorScheme="teal" fontSize="md" p={2}>
                    Chakra UI
                  </Badge>
                </WrapItem>
                <WrapItem>
                  <Badge colorScheme="orange" fontSize="md" p={2}>
                    TypeScript
                  </Badge>
                </WrapItem>
              </Wrap>
            </VStack>
          </Box>
        </SimpleGrid>

        <Divider />

        {/* Modal & Avatar */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
          <Heading size="md" mb={4}>Modal & Avatar</Heading>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <HStack>
              <Avatar name="John Doe" src="https://bit.ly/broken-link" size="lg" />
              <Box>
                <Text fontWeight="bold">John Doe</Text>
                <Text fontSize="sm" color="gray.500">john@example.com</Text>
              </Box>
            </HStack>

            <HStack>
              <Avatar name="Jane Smith" size="md" bg="pink.500" />
              <Avatar name="Bob Wilson" size="sm" bg="purple.500" />
              <Avatar name="Alice Brown" size="xs" bg="teal.500" />
            </HStack>

            <Button colorScheme="brand" onClick={onOpen}>
              Open Modal
            </Button>
          </Flex>
        </Box>

        {/* Modal Component */}
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Welcome! 👋</ModalHeader>
            <ModalBody>
              <Text mb={4}>
                This is a Chakra UI modal component. It provides a clean overlay
                with centered content for important interactions.
              </Text>
              <VStack spacing={3}>
                <Input placeholder="Enter your email" />
                <Input placeholder="Enter password" type="password" />
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="brand" onClick={onClose}>
                Sign In
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Loading States */}
        <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
          <Heading size="md" mb={4}>Loading States</Heading>
          <HStack spacing={8} justify="center" wrap="wrap">
            <VStack>
              <Spinner size="xl" color="brand.500" />
              <Text>Default</Text>
            </VStack>
            <VStack>
              <Spinner size="lg" color="green.500" thickness="4px" />
              <Text>Custom Thickness</Text>
            </VStack>
            <VStack>
              <Spinner size="md" color="purple.500" speed="0.65s" />
              <Text>Custom Speed</Text>
            </VStack>
            <VStack>
              <Spinner size="sm" color="orange.500" emptyColor="gray.200" />
              <Text>Empty Color</Text>
            </VStack>
          </HStack>
        </Box>

        {/* Footer */}
        <Box textAlign="center" py={4}>
          <Text color="gray.500">
            Built with ❤️ using Chakra UI
          </Text>
        </Box>
      </VStack>
    </Container>
  );
};
const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <ChakraDemo />
    </ChakraProvider>
  );
};
export default App;