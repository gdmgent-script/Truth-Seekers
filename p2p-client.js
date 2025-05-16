// Truth Seekers - WebRTC P2P Implementation
// This version uses PeerJS for WebRTC connections without requiring a server

// Global variables
let myPeerId = null;
let myConnection = null;
let connections = {};
let isHost = false;
let playerName = '';
let roomCode = '';
let myRole = '';

// Game state
let gameState = {
  players: [],
  currentPlayerIndex: 0,
  currentQuestionId: 0,
  fakemakerUnmasked: false,
  gamePhase: "setup",
  fakemakerName: null,
  questions: []
};

// Initialize PeerJS
function initializePeerJS() {
  // Generate a random ID for this peer
  const randomId = Math.random().toString(36).substring(2, 15);
  
  // Create a new Peer with the random ID
  // Using the free PeerJS server - no account required
  const peer = new Peer(randomId, {
    host: 'peerjs-server.herokuapp.com',
    secure: true,
    port: 443,
    debug: 2
  });
  
  // When the peer connection is established
  peer.on('open', (id) => {
    console.log('My peer ID is: ' + id);
    myPeerId = id;
    
    // If this is the first screen, show the start/join options
    if (gameState.gamePhase === "setup") {
      document.getElementById('peerId').textContent = id;
      showScreen('startScreen');
    }
  });
  
  // When a new connection is received
  peer.on('connection', (conn) => {
    console.log('New connection from: ' + conn.peer);
    
    // Set up connection handlers
    setupConnectionHandlers(conn);
    
    // If we're the host, add this connection to our list
    if (isHost) {
      connections[conn.peer] = conn;
    } else {
      // If we're not the host, this must be the host connecting to us
      myConnection = conn;
    }
  });
  
  // Handle errors
  peer.on('error', (err) => {
    console.error('PeerJS error:', err);
    alert('Connection error: ' + err.type);
  });
  
  return peer;
}

// Set up handlers for a connection
function setupConnectionHandlers(conn) {
  // When the connection is established
  conn.on('open', () => {
    console.log('Connection established with: ' + conn.peer);
    
    // If we're the host and this is a new player
    if (isHost) {
      // Send the current game state to the new player
      conn.send({
        type: 'GAME_STATE',
        gameState: gameState
      });
    }
  });
  
  // When data is received
  conn.on('data', (data) => {
    console.log('Received data:', data);
    handleMessage(data, conn);
  });
  
  // When the connection is closed
  conn.on('close', () => {
    console.log('Connection closed with: ' + conn.peer);
    
    // If we're the host, remove this connection from our list
    if (isHost) {
      delete connections[conn.peer];
      
      // Remove the player from the game state
      const playerIndex = gameState.players.findIndex(p => p.peerId === conn.peer);
      if (playerIndex !== -1) {
        gameState.players.splice(playerIndex, 1);
        
        // Update the player list
        updatePlayerList();
        
        // Broadcast the updated player list to all clients
        broadcastToAll({
          type: 'PLAYER_LIST_UPDATE',
          players: gameState.players.map(p => ({ name: p.name, peerId: p.peerId }))
        });
      }
    }
  });
}

// Handle incoming messages
function handleMessage(data, conn) {
  switch (data.type) {
    case 'JOIN_REQUEST':
      handleJoinRequest(data, conn);
      break;
    case 'JOIN_ACCEPTED':
      handleJoinAccepted(data);
      break;
    case 'PLAYER_LIST_UPDATE':
      handlePlayerListUpdate(data);
      break;
    case 'GAME_STATE':
      handleGameState(data);
      break;
    case 'ROLE_CODE_ENTERED':
      handleRoleCodeEntered(data, conn);
      break;
    case 'ROLE_CONFIRMED':
      handleRoleConfirmed(data);
      break;
    case 'GAME_STARTED':
      handleGameStarted(data);
      break;
    case 'TURN_START':
      handleTurnStart(data);
      break;
    case 'YOUR_TURN':
      handleYourTurn(data);
      break;
    case 'SHOW_QUESTION':
      handleShowQuestion(data);
      break;
    case 'ANSWER_SUBMISSION':
      handleAnswerSubmission(data);
      break;
    case 'ANSWER_RESULT':
      handleAnswerResult(data);
      break;
    case 'ATTEMPT_UNMASK':
      handleAttemptUnmask(data);
      break;
    case 'FAKEMAKER_UNMASKED':
      handleFakemakerUnmasked(data);
      break;
    case 'ACCUSATION_FAILED':
      handleAccusationFailed(data);
      break;
    case 'GAME_OVER':
      handleGameOver(data);
      break;
    default:
      console.log('Unknown message type:', data.type);
  }
}

// Create a new game as host
function createGame() {
  const name = document.getElementById('hostName').value.trim();
  if (!name) {
    alert('Please enter your name');
    return;
  }
  
  playerName = name;
  isHost = true;
  
  // Generate a 6-character room code
  roomCode = generateRoomCode();
  document.getElementById('roomCodeDisplay').textContent = roomCode;
  
  // Initialize game state
  gameState.players = [{
    name: playerName,
    peerId: myPeerId,
    role: '',
    position: 0,
    isFakemakerRevealedThisTurn: false
  }];
  
  // Load questions
  loadQuestions().then(() => {
    // Show the host screen
    showScreen('hostScreen');
  });
}

// Generate a 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Join an existing game
function joinGame() {
  const name = document.getElementById('joinName').value.trim();
  const code = document.getElementById('joinRoomCode').value.trim().toUpperCase();
  const hostId = document.getElementById('joinHostId').value.trim();
  
  if (!name || !code || !hostId) {
    alert('Please fill in all fields');
    return;
  }
  
  playerName = name;
  roomCode = code;
  
  // Connect to the host
  const peer = myPeer || initializePeerJS();
  myConnection = peer.connect(hostId);
  
  // Set up connection handlers
  setupConnectionHandlers(myConnection);
  
  // Show loading screen
  showScreen('loadingScreen');
  
  // Set a timeout to send the join request after connection is established
  setTimeout(() => {
    if (myConnection && myConnection.open) {
      myConnection.send({
        type: 'JOIN_REQUEST',
        playerName: playerName,
        roomCode: roomCode,
        peerId: myPeerId
      });
    } else {
      alert('Could not connect to the host. Please check the host ID and try again.');
      showScreen('joinScreen');
    }
  }, 1000);
}

// Handle join request (host only)
function handleJoinRequest(data, conn) {
  if (!isHost) return;
  
  // Verify room code
  if (data.roomCode !== roomCode) {
    conn.send({
      type: 'JOIN_REJECTED',
      reason: 'Invalid room code'
    });
    return;
  }
  
  // Check if name is already taken
  if (gameState.players.some(p => p.name === data.playerName)) {
    conn.send({
      type: 'JOIN_REJECTED',
      reason: 'Name already taken'
    });
    return;
  }
  
  // Add player to game state
  gameState.players.push({
    name: data.playerName,
    peerId: data.peerId,
    role: '',
    position: 0,
    isFakemakerRevealedThisTurn: false
  });
  
  // Send join accepted message
  conn.send({
    type: 'JOIN_ACCEPTED',
    playerName: data.playerName
  });
  
  // Update player list
  updatePlayerList();
  
  // Broadcast updated player list to all clients
  broadcastToAll({
    type: 'PLAYER_LIST_UPDATE',
    players: gameState.players.map(p => ({ name: p.name, peerId: p.peerId }))
  });
}

// Handle join accepted message (client only)
function handleJoinAccepted(data) {
  console.log('Join accepted:', data);
  showScreen('lobbyScreen');
}

// Handle player list update
function handlePlayerListUpdate(data) {
  const playerList = document.getElementById('playerList');
  playerList.innerHTML = '';
  
  data.players.forEach(player => {
    const li = document.createElement('li');
    li.textContent = player.name;
    if (player.peerId === myPeerId) {
      li.style.fontWeight = 'bold';
    }
    playerList.appendChild(li);
  });
  
  document.getElementById('playerCount').textContent = `Players: ${data.players.length}/6`;
}

// Update the player list display
function updatePlayerList() {
  const playerList = document.getElementById('playerList');
  playerList.innerHTML = '';
  
  gameState.players.forEach(player => {
    const li = document.createElement('li');
    li.textContent = player.name;
    if (player.peerId === myPeerId) {
      li.style.fontWeight = 'bold';
    }
    playerList.appendChild(li);
  });
  
  document.getElementById('playerCount').textContent = `Players: ${gameState.players.length}/6`;
}

// Handle game state update
function handleGameState(data) {
  gameState = data.gameState;
  
  // Update UI based on game state
  updatePlayerList();
  
  // If the game has already started, show the appropriate screen
  if (gameState.gamePhase !== "setup" && gameState.gamePhase !== "lobby") {
    // Find our player
    const myPlayerIndex = gameState.players.findIndex(p => p.peerId === myPeerId);
    
    if (myPlayerIndex === gameState.currentPlayerIndex) {
      // It's our turn
      showScreen('turnScreen');
    } else {
      // It's someone else's turn
      showScreen('waitingForTurnScreen');
      document.getElementById('currentPlayerName').textContent = gameState.players[gameState.currentPlayerIndex].name;
    }
  }
}

// Start the game (host only)
function startGame() {
  if (!isHost) {
    alert('Only the host can start the game');
    return;
  }
  
  // Show role code entry screen
  showScreen('roleCodeScreen');
  
  // Broadcast game started message
  broadcastToAll({
    type: 'GAME_STARTED'
  });
}

// Submit role code
function submitRoleCode() {
  const roleCode = document.getElementById('roleCodeInput').value.trim();
  if (!roleCode) {
    alert('Please enter your role code');
    return;
  }
  
  // If we're the host, handle it directly
  if (isHost) {
    const roleEntry = validateRoleCode(roleCode);
    if (!roleEntry) {
      alert('Invalid role code');
      return;
    }
    
    // Update our role in the game state
    const myPlayerIndex = gameState.players.findIndex(p => p.peerId === myPeerId);
    gameState.players[myPlayerIndex].role = roleEntry.role;
    
    // If this is the Fakemaker, record their name
    if (roleEntry.role === "Fakemaker") {
      gameState.fakemakerName = playerName;
    }
    
    myRole = roleEntry.role;
    document.getElementById('myRoleDisplay').textContent = myRole;
    showScreen('waitingForPlayersScreen');
    
    // Check if all players have roles
    checkAllRolesAssigned();
  } else {
    // Send role code to host
    myConnection.send({
      type: 'ROLE_CODE_ENTERED',
      playerName: playerName,
      roleCode: roleCode
    });
  }
}

// Validate role code
function validateRoleCode(code) {
  const pincodes = [
    { pincode: "1288", role: "Fakemaker" },
    { pincode: "7523", role: "Factchecker" },
    { pincode: "7358", role: "Factchecker" },
    { pincode: "6411", role: "Factchecker" },
    { pincode: "9876", role: "Factchecker" },
    { pincode: "5432", role: "Factchecker" }
  ];
  
  return pincodes.find(entry => entry.pincode === code);
}

// Handle role code entered (host only)
function handleRoleCodeEntered(data, conn) {
  if (!isHost) return;
  
  // Find player
  const playerIndex = gameState.players.findIndex(p => p.name === data.playerName);
  if (playerIndex === -1) return;
  
  // Validate role code
  const roleEntry = validateRoleCode(data.roleCode);
  if (!roleEntry) {
    conn.send({
      type: 'ROLE_REJECTED',
      reason: 'Invalid role code'
    });
    return;
  }
  
  // Assign role to player
  gameState.players[playerIndex].role = roleEntry.role;
  
  // If this is the Fakemaker, record their name
  if (roleEntry.role === "Fakemaker") {
    gameState.fakemakerName = data.playerName;
  }
  
  // Send role confirmation to player
  conn.send({
    type: 'ROLE_CONFIRMED',
    role: roleEntry.role
  });
  
  // Check if all players have roles
  checkAllRolesAssigned();
}

// Check if all players have roles assigned
function checkAllRolesAssigned() {
  if (!isHost) return;
  
  // Check if all players have roles
  if (gameState.players.every(player => player.role !== '')) {
    // Show start game button
    document.getElementById('startGameAfterRolesBtn').style.display = 'block';
  }
}

// Handle role confirmed message (client only)
function handleRoleConfirmed(data) {
  myRole = data.role;
  document.getElementById('myRoleDisplay').textContent = myRole;
  showScreen('waitingForPlayersScreen');
}

// Start game after roles assigned (host only)
function startGameAfterRoles() {
  if (!isHost) return;
  
  // Initialize game state
  gameState.currentPlayerIndex = 0;
  gameState.currentQuestionId = 0;
  gameState.gamePhase = "turnStart";
  
  // Broadcast game started message
  broadcastToAll({
    type: 'GAME_STARTED',
    firstPlayer: gameState.players[0].name
  });
  
  // Start first turn
  startNextTurn();
}

// Handle game started message
function handleGameStarted(data) {
  showScreen('gameStartedScreen');
  
  if (data && data.firstPlayer) {
    document.getElementById('firstPlayerName').textContent = data.firstPlayer;
  }
  
  // If this client is the first player, show the turn screen after a delay
  if (isHost || (data && data.firstPlayer === playerName)) {
    setTimeout(() => {
      showScreen('turnScreen');
    }, 3000);
  }
}

// Start next turn (host only)
function startNextTurn() {
  if (!isHost) return;
  
  if (gameState.fakemakerUnmasked) {
    endGame(`De Fakemaker, ${gameState.fakemakerName}, is ontmaskerd! De Factcheckers winnen!`);
    return;
  }
  
  // Cycle through questions
  gameState.currentQuestionId = (gameState.currentQuestionId + 1) % gameState.questions.length;
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentQuestion = gameState.questions[gameState.currentQuestionId];
  
  // Broadcast turn start
  broadcastToAll({
    type: 'TURN_START',
    playerName: currentPlayer.name,
    questionId: gameState.currentQuestionId
  });
  
  // Send private role info to current player
  const playerConnection = connections[currentPlayer.peerId];
  if (playerConnection) {
    playerConnection.send({
      type: 'YOUR_TURN',
      role: currentPlayer.role,
      questionId: currentQuestion.id,
      questionAnswer: currentQuestion.answer ? "Waar" : "Fout"
    });
  } else if (currentPlayer.peerId === myPeerId) {
    // If it's the host's turn
    handleYourTurn({
      role: currentPlayer.role,
      questionId: currentQuestion.id,
      questionAnswer: currentQuestion.answer ? "Waar" : "Fout"
    });
  }
}

// Handle turn start message
function handleTurnStart(data) {
  // Update UI
  document.getElementById('currentPlayerTurn').textContent = data.playerName;
  
  // If it's this client's turn, show the turn screen
  if (data.playerName === playerName) {
    showScreen('turnScreen');
  } else {
    showScreen('waitingForTurnScreen');
    document.getElementById('currentPlayerName').textContent = data.playerName;
  }
}

// Handle your turn message
function handleYourTurn(data) {
  document.getElementById('currentPlayerRoleText').textContent = data.role;
  document.getElementById('currentQuestionNumberText').textContent = data.questionId;
  document.getElementById('currentQuestionAnswerText').textContent = data.questionAnswer;
  
  // Show or hide the answer based on role
  if (data.role === "Fakemaker") {
    document.getElementById('visibleAnswer').style.display = 'block';
  } else {
    document.getElementById('visibleAnswer').style.display = 'none';
  }
}

// Show question
function showQuestion() {
  // If we're the host, handle it directly
  if (isHost) {
    const questionIndex = gameState.currentQuestionId % gameState.questions.length;
    const question = gameState.questions[questionIndex];
    
    document.getElementById('questionNumberDisplay').textContent = `Vraag ${questionIndex}`;
    document.getElementById('questionContentDisplay').textContent = question.content;
    
    showScreen('questionScreen');
  } else {
    // Send request to host
    myConnection.send({
      type: 'SHOW_QUESTION',
      playerName: playerName
    });
  }
}

// Handle show question request (host only)
function handleShowQuestion(data) {
  if (!isHost) return;
  
  // Find the player's connection
  const playerIndex = gameState.players.findIndex(p => p.name === data.playerName);
  if (playerIndex === -1) return;
  
  const playerConnection = connections[gameState.players[playerIndex].peerId];
  if (!playerConnection) return;
  
  // Send question to player
  const questionIndex = gameState.currentQuestionId % gameState.questions.length;
  const question = gameState.questions[questionIndex];
  
  playerConnection.send({
    type: 'QUESTION_DATA',
    questionIndex: questionIndex,
    questionContent: question.content
  });
}

// Submit answer
function submitAnswer(answer) {
  // If we're the host, handle it directly
  if (isHost) {
    handleAnswerSubmission({
      playerName: playerName,
      answer: answer
    });
  } else {
    // Send answer to host
    myConnection.send({
      type: 'ANSWER_SUBMISSION',
      playerName: playerName,
      answer: answer
    });
  }
}

// Handle answer submission (host only)
function handleAnswerSubmission(data) {
  if (!isHost) return;
  
  // Validate current player
  if (gameState.players[gameState.currentPlayerIndex].name !== data.playerName) {
    return;
  }
  
  // Process answer
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const questionIndex = gameState.currentQuestionId % gameState.questions.length;
  const currentQuestion = gameState.questions[questionIndex];
  
  if (data.answer === currentQuestion.answer) { // Correct answer
    currentPlayer.position += 1;
    broadcastToAll({
      type: 'ANSWER_RESULT',
      playerName: data.playerName,
      correct: true,
      newPosition: currentPlayer.position,
      message: `${data.playerName} gaat 1 stap vooruit.`
    });
  } else { // Wrong answer
    const penalty = Math.floor(Math.random() * 5) + 1;
    currentPlayer.position = Math.max(0, currentPlayer.position - penalty);
    broadcastToAll({
      type: 'ANSWER_RESULT',
      playerName: data.playerName,
      correct: false,
      newPosition: currentPlayer.position,
      message: `${data.playerName} gaat ${penalty} stap(pen) achteruit.`
    });
  }
  
  // If we're the host and it's our turn, update the UI
  if (isHost && currentPlayer.peerId === myPeerId) {
    handleAnswerResult({
      playerName: data.playerName,
      correct: data.answer === currentQuestion.answer,
      newPosition: currentPlayer.position,
      message: data.answer === currentQuestion.answer
        ? `${data.playerName} gaat 1 stap vooruit.`
        : `${data.playerName} gaat ${Math.floor(Math.random() * 5) + 1} stap(pen) achteruit.`
    });
  }
}

// Handle answer result message
function handleAnswerResult(data) {
  document.getElementById('resultTitle').textContent = data.correct ? 'Correct!' : 'Wrong!';
  document.getElementById('resultFeedback').textContent = data.message;
  
  showScreen('resultScreen');
}

// Next turn
function nextTurn() {
  // If we're the host, handle it directly
  if (isHost) {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    startNextTurn();
  } else {
    // Send next turn request to host
    myConnection.send({
      type: 'TURN_COMPLETE',
      playerName: playerName
    });
  }
}

// Attempt to unmask the Fakemaker
function attemptUnmask() {
  const accusedName = prompt('Who do you think is the Fakemaker? Enter their name:');
  if (!accusedName || accusedName.trim() === '') {
    return;
  }
  
  // If we're the host, handle it directly
  if (isHost) {
    handleAttemptUnmask({
      accusedName: accusedName.trim()
    });
  } else {
    // Send attempt to host
    myConnection.send({
      type: 'ATTEMPT_UNMASK',
      accusedName: accusedName.trim()
    });
  }
}

// Handle attempt to unmask (host only)
function handleAttemptUnmask(data) {
  if (!isHost) return;
  
  if (data.accusedName === gameState.fakemakerName) {
    // Correct accusation
    gameState.fakemakerUnmasked = true;
    broadcastToAll({
      type: 'FAKEMAKER_UNMASKED',
      fakemakerName: gameState.fakemakerName,
      message: `De Fakemaker, ${gameState.fakemakerName}, is ontmaskerd! De Factcheckers winnen!`
    });
    endGame(`De Fakemaker, ${gameState.fakemakerName}, is ontmaskerd! De Factcheckers winnen!`);
  } else {
    // Wrong accusation
    broadcastToAll({
      type: 'ACCUSATION_FAILED',
      accusedName: data.accusedName,
      message: `${data.accusedName} is niet de Fakemaker. Het spel gaat verder.`
    });
    
    // Move to next player
    setTimeout(() => {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
      startNextTurn();
    }, 2000);
  }
}

// Handle Fakemaker unmasked message
function handleFakemakerUnmasked(data) {
  document.getElementById('fakemakerStatus').textContent = data.message;
  setTimeout(() => {
    handleGameOver({
      reason: data.message
    });
  }, 3000);
}

// Handle accusation failed message
function handleAccusationFailed(data) {
  document.getElementById('fakemakerStatus').textContent = data.message;
}

// End game (host only)
function endGame(reason) {
  if (!isHost) return;
  
  gameState.gamePhase = "gameOver";
  
  broadcastToAll({
    type: 'GAME_OVER',
    reason: reason
  });
  
  // Update our own UI
  document.getElementById('gameOverReason').textContent = reason;
  showScreen('gameOverScreen');
}

// Handle game over message
function handleGameOver(data) {
  document.getElementById('gameOverReason').textContent = data.reason;
  showScreen('gameOverScreen');
}

// Restart game
function restartGame() {
  if (isHost) {
    // Reset game state
    gameState = {
      players: [{
        name: playerName,
        peerId: myPeerId,
        role: '',
        position: 0,
        isFakemakerRevealedThisTurn: false
      }],
      currentPlayerIndex: 0,
      currentQuestionId: 0,
      fakemakerUnmasked: false,
      gamePhase: "setup",
      fakemakerName: null,
      questions: gameState.questions
    };
    
    // Generate a new room code
    roomCode = generateRoomCode();
    document.getElementById('roomCodeDisplay').textContent = roomCode;
    
    // Clear connections
    connections = {};
    
    // Show host screen
    showScreen('hostScreen');
  } else {
    // Non-hosts just go back to the join screen
    showScreen('joinScreen');
  }
}

// Load questions from JSON
async function loadQuestions() {
  try {
    const response = await fetch('questions.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const questions = await response.json();
    
    // Shuffle questions
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const hour = now.getHours();
    const finalSeed = seed * 100 + hour;
    
    gameState.questions = seededShuffle(questions, finalSeed);
    
    console.log(`Loaded ${gameState.questions.length} questions`);
    return true;
  } catch (error) {
    console.error('Error loading questions:', error);
    alert('Error loading questions. Please try again.');
    return false;
  }
}

// Shuffle function with seed
function seededShuffle(array, seed) {
  const prng = mulberry32(seed);
  const shuffled = array.slice();

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Simple PRNG based on seed
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Broadcast message to all connected clients
function broadcastToAll(message) {
  if (!isHost) return;
  
  Object.values(connections).forEach(conn => {
    if (conn.open) {
      conn.send(message);
    }
  });
  
  // Also handle the message ourselves
  handleMessage(message, null);
}

// Utility function to show a specific screen
function showScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.style.opacity = '0';
    screen.style.pointerEvents = 'none';
  });
  
  const activeScreen = document.getElementById(screenId);
  if (activeScreen) {
    activeScreen.style.opacity = '1';
    activeScreen.style.pointerEvents = 'auto';
  } else {
    console.error('Screen not found:', screenId);
  }
}

// Initialize the application
let myPeer = null;
window.onload = () => {
  // Initialize PeerJS
  myPeer = initializePeerJS();
  
  // Set up event listeners
  document.getElementById('createGameBtn').addEventListener('click', () => {
    showScreen('createGameScreen');
  });
  
  document.getElementById('joinGameBtn').addEventListener('click', () => {
    showScreen('joinScreen');
  });
  
  document.getElementById('hostStartBtn').addEventListener('click', createGame);
  document.getElementById('joinStartBtn').addEventListener('click', joinGame);
  document.getElementById('startGameBtn').addEventListener('click', startGame);
  document.getElementById('submitRoleCodeBtn').addEventListener('click', submitRoleCode);
  document.getElementById('startGameAfterRolesBtn').addEventListener('click', startGameAfterRoles);
  document.getElementById('showQuestionBtn').addEventListener('click', showQuestion);
  document.getElementById('nextTurnBtn').addEventListener('click', nextTurn);
  document.getElementById('attemptUnmaskBtn').addEventListener('click', attemptUnmask);
  document.getElementById('restartGameBtn').addEventListener('click', restartGame);
  
  // Show loading screen initially while PeerJS connects
  showScreen('loadingScreen');
};
