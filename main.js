var TILE_SIZE = 30;
var NUM_ROWS = 10;
var NUM_COLS = 15;

var SIDEBAR_WIDTH = 250;
var BOTTOMBAR_HEIGHT = 80;


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
      messages: []
    };

    map = generateMap();
    actors = generateActors();

    updateScreen();

    initializeSidebar();
    updateSidebar();

    initializeBottombar();
    addMessage('You feel a weirdly familiar disorientation.');

    game.input.keyboard.addCallbacks(null, null, onKeyUp);
  }

  function generateMap() {
    map = [];
    for (var y = 0; y < NUM_ROWS; y++) {
      mapRow = [];
      for (var x = 0; x < NUM_COLS; x++) {
        var threshold = 0.15;
        var wallAbove = y > 0 && map[y-1][x] === '#';
        var wallLeft = x > 0 && mapRow[x-1] === '#';
        if (wallAbove && wallLeft) {
          threshold = 0;
        } else if (wallAbove || wallLeft) {
          threshold = 0.3;
        }
        if (y === 0 || y === NUM_ROWS -1 ||
            x === 0 || x === NUM_COLS - 1 ||
            Math.random() < threshold) {
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
    var playerDamage = Math.ceil(player.attack * (1.2 - Math.random()*0.4)) - actor.defense;
    var actorDamage = Math.ceil(actor.attack * (1.2 - Math.random()*0.4)) - player.defense;
    actor.currentHP = Math.max(0, actor.currentHP - playerDamage);
    var message = capitalize(player.name) + ' hit ' + actor.name + ' for ' + playerDamage + ' damage!';
    addMessage(message);
    if (actor.currentHP > 0) {
      player.currentHP = Math.max(0, player.currentHP - actorDamage);
      message = capitalize(actor.name) + ' hit ' + player.name + ' for ' + actorDamage + ' damage!';
      addMessage(message);
      var percentHP = actor.currentHP / actor.maxHP;
      if (percentHP < 0.25) {
        addMessage(capitalize(actor.name) + ' is bleeding profusely.');
      } else if (percentHP < 0.5) {
        addMessage(capitalize(actor.name) + ' breathes heavily.');
      }
    } else {
      killActor(actor);
      message = capitalize(player.name) + ' killed ' + actor.name + '!';
      addMessage(message);
    }
    updateSidebar();
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
      '',
      {
        font: '15px monospace',
        fill: '#fff',
      }
    );
  }

  function updateBottombar() {
    messageDisplay.text = worldState.messages.slice(-3).join('\n');
  }

  function addMessage(message) {
    worldState.messages.push(message);
    updateBottombar();
  }

  function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
  }
}