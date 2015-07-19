var TILE_SIZE = 30;
var NUM_ROWS = 10;
var NUM_COLS = 15;

var SIDEBAR_WIDTH = 250;
var BOTTOMBAR_HEIGHT = 60;


function init(parent) {
  var state = {
    create: create,
  };

  var game = new Phaser.Game(
    NUM_COLS * TILE_SIZE + SIDEBAR_WIDTH,
    NUM_ROWS * TILE_SIZE + BOTTOMBAR_HEIGHT,
    Phaser.AUTO,
    parent,
    state,
    false,
    false
  );

  function create() {
    initializeScreen();

    worldState = {
      currentQuest: 'Kill the (B)addie!',
      lastMessage: 'You feel a weirdly familiar disorientation.'
    };

    map = generateMap();
    actors = generateActors();

    updateScreen();

    initializeSidebar();
    updateSidebar();

    initializeBottombar();

    game.input.keyboard.addCallbacks(null, null, onKeyUp);
  }

  function generateMap() {
    map = [];
    for (var y = 0; y < NUM_ROWS; y++) {
      mapRow = [];
      for (var x = 0; x < NUM_COLS; x++) {
        if (y === 0 || y === NUM_ROWS -1 ||
            x === 0 || x === NUM_COLS - 1 ||
            Math.random() > 0.8) {
          c = '#';
        } else {
          c = '.';
        }
        mapRow.push(c);
      }
      map.push(mapRow);
    }
    return map;
  }

  function generateActors() {
    actors = {};
    player = {
      id: 'player',
      tile: '@',
      x: Math.ceil(Math.random() * 3),
      y: Math.ceil(Math.random() * 3),
      currentHP: 100,
      maxHP: 100,
      attack: 10,
      defense: 0,
      name: 'you'
    };
    actors[player.id] = player;
    enemy = {
      id: 'enemy',
      tile: 'B',
      x: NUM_COLS - Math.ceil(Math.random() * 2) - 1,
      y: NUM_ROWS - Math.ceil(Math.random() * 2) - 1 ,
      currentHP: 75,
      maxHP: 75,
      attack: 5,
      defense: 1,
      name: 'the big baddie'
    };
    actors[enemy.id] = enemy;
    for (var id in actors) {
      var actor = actors[id];
      // HACK: Just set wherever an actor is to a floor tile
      // in case it was a wall.
      map[actor.y][actor.x] = '.';
      actorPositions[actor.y][actor.x] = actor;
    }
    return actors;
  }

  function onKeyUp(event) {
    switch(event.keyCode) {
      case Phaser.Keyboard.LEFT:
        movePlayer({x: -1});
        break;
      case Phaser.Keyboard.RIGHT:
        movePlayer({x: 1});
        break;
      case Phaser.Keyboard.UP:
        movePlayer({y: -1});
        break;
      case Phaser.Keyboard.DOWN:
        movePlayer({y: 1});
        break;
    }
  }

  function initializeScreen() {
    gameScreen = [];
    actorPositions = [];
    for (var y = 0; y < NUM_ROWS; y++) {
      screenRow = [];
      actorPosRow = [];
      for (var x = 0; x < NUM_COLS; x++) {
        screenRow.push(createTile('.', x, y));
        actorPosRow.push(null);
      }
      gameScreen.push(screenRow);
      actorPositions.push(actorPosRow);
    }
  }

  function updateScreen() {
    for (var y = 0; y < NUM_ROWS; y++) {
      row = map[y];
      for (var x = 0; x < NUM_COLS; x++) {
        gameScreen[y][x].text = row[x];
      }
    }
    updateActors();
  }

  function updateActors() {
    for (var name in actors) {
      var actor = actors[name];
      gameScreen[actor.y][actor.x].text = actor.tile;
    }
  }

  function movePlayer(dir) {
    x = player.x + (dir.x || 0);
    y = player.y + (dir.y || 0);
    actor = actorPositions[y][x];
    if (actor !== null) {
      doCombat(player, actor);
    } else if (map[y][x] === '.' &&
        y >= 0 && y < NUM_ROWS &&
        x >= 0 && x < NUM_COLS) {
      actorPositions[player.y][player.x] = null;
      actorPositions[y][x] = player;
      player.x = x;
      player.y = y;
      updateScreen();
    }
  }

  function doCombat(player, actor) {
    var playerDamage = player.attack - actor.defense;
    var actorDamage = actor.attack - player.defense;
    actor.currentHP = Math.max(0, actor.currentHP - playerDamage);
    var message = capitalize(player.name) + ' hit ' + actor.name + ' for ' + playerDamage + ' damage!';
    if (actor.currentHP > 0) {
      player.currentHP = Math.max(0, player.currentHP - actorDamage);
      message += '\n';
      message += capitalize(actor.name) + ' hit ' + player.name + ' for ' + actorDamage + ' damage!';
    } else {
      killActor(actor);
      message += '\n';
      message += capitalize(player.name) + ' killed ' + actor.name + '!';
    }
    worldState.lastMessage = message;

    updateSidebar();
    updateBottombar();
  }

  function killActor(actor) {
    delete actors[actor.id];
    actorPositions[actor.y][actor.x] = null;
    resetTile(actor.x, actor.y);
    if (actor.id === 'enemy') {
      worldState.currentQuest = 'Escape the dungeon!';
      updateSidebar();
    }
  }

  var textStyle = {
    font: TILE_SIZE + 'px monospace',
    fill: '#fff'
  };

  function createTile(tile, x, y) {
    return game.add.text(
      x * TILE_SIZE,
      y * TILE_SIZE,
      tile,
      textStyle
    );
  }

  function resetTile(x, y) {
    gameScreen[y][x].text = map[y][x];
  }

  var sidebarTextStyle = {
    font: '15px monospace',
    fill: '#fff'
  };

  function initializeSidebar() {
    var sidebarX = NUM_COLS * TILE_SIZE;
    // Fixed text items:
    game.add.text(
      sidebarX,
      0,
      'Welcome, Adventurer!',
      sidebarTextStyle
    );
    game.add.text(
      sidebarX,
      30,
      'HP:',
      sidebarTextStyle
    );
    game.add.text(
      sidebarX,
      50,
      'Attack:',
      sidebarTextStyle
    );
    game.add.text(
      sidebarX,
      70,
      'Defense:',
      sidebarTextStyle
    );
    game.add.text(
      sidebarX,
      110,
      'Quest:',
      sidebarTextStyle
    );

    // Text items with dynamic values:
    var valuesX = sidebarX + 120;
    hpDisplay = game.add.text(
      valuesX,
      30,
      '',
      sidebarTextStyle
    );
    attackDisplay = game.add.text(
      valuesX,
      50,
      '',
      sidebarTextStyle
    );
    defenseDisplay = game.add.text(
      valuesX,
      70,
      '',
      sidebarTextStyle
    );
    questDisplay = game.add.text(
      sidebarX + 10,
      130,
      '',
      sidebarTextStyle
    );
  }

  function updateSidebar() {
    hpDisplay.text = player.currentHP + '/' + player.maxHP;
    attackDisplay.text = player.attack;
    defenseDisplay.text = player.defense;

    questDisplay.text = worldState.currentQuest;
  }

  function initializeBottombar() {
    messageDisplay = game.add.text(
      10,
      NUM_ROWS * TILE_SIZE + 10,
      worldState.lastMessage,
      {
        font: '15px monospace',
        fill: '#fff',
      }
    );
  }

  function updateBottombar() {
    messageDisplay.text = worldState.lastMessage;
  }

  function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
  }
}