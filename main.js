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

  var Actor = {
    create: function(id, tile, name, stats, position, options) {
      var actor = Object.create(this);
      actor.id = id;
      actor.tile = tile;
      actor.name = name;

      actor.currentHP = actor.maxHP = stats.maxHP;
      if (stats.currentHP) {
        actor.currentHP = stats.currentHP;
      }
      actor.attack = stats.attack;
      actor.defense = stats.defense;

      actor.x = actor.y = null;
      actor.setPosition(position);

      if (options) {
        for (var key in options) {
          actor[key] = options[key];
        }
      }
      game.actors[id] = actor;
      return actor;
    },
    setPosition: function(position) {
      if (this.x === null && this.y === null) {
        // This is the initial setting of position.
        // HACK: Just set wherever an actor is to a floor tile
        // in case it was a wall.
        game.map[position.y][position.x] = '.';
      } else {
        game.actorPositions[this.y][this.x] = null;
      }
      this.x = position.x;
      this.y = position.y;
      game.actorPositions[this.y][this.x] = this;
    },
    isAlive: function() {
      return this.currentHP > 0;
    },
    move: function(dir) {
      x = this.x + (dir.x || 0);
      y = this.y + (dir.y || 0);
      actor = game.actorPositions[y][x];
      if (actor !== null) {
        this.attackTarget(actor);
        if (actor.isAlive()) {
          actor.reactToAttack(this);
        }
      } else if (game.map[y][x] === '.' &&
          y >= 0 && y < NUM_ROWS &&
          x >= 0 && x < NUM_COLS) {
        this.setPosition({x: x, y: y});
        updateScreen();
      }
    },
    attackTarget: function(target) {
      var damage = Math.ceil(this.attack * (1.2 - Math.random()*0.4)) - target.defense;
      target.currentHP = Math.max(0, target.currentHP - damage);
      var message = capitalize(this.name) + ' hit ' + target.name + ' for ' + damage + ' damage!';
      addMessage(message);
      if (target.isAlive()) {
        var percentHP = target.currentHP / target.maxHP;
        if (percentHP < 0.25) {
          addMessage(capitalize(target.name) + ' is bleeding profusely.');
        } else if (percentHP < 0.5) {
          addMessage(capitalize(target.name) + ' is breathing heavily.');
        }
      } else {
        target.kill();
        message = capitalize(this.name) + ' killed ' + target.name + '!';
        addMessage(message);
      }
      game.sidebar.update();
    },
    reactToAttack: function(attacker) {
      // Default behavior is to just retaliate.
      this.attackTarget(attacker);
    },
    kill: function() {
      delete game.actors[this.id];
      game.actorPositions[this.y][this.x] = null;
      resetTile(this.x, this.y);
      if (this.id === 'enemy') {
        game.worldState.currentQuest = 'Escape! [coming soon]';
        game.sidebar.update();
      }
    },
  };

  var Sidebar = {
    textStyle: {
      font: '15px monospace',
      fill: '#fff',
    },
    x: NUM_COLS * TILE_SIZE,
    init: function() {
      // Fixed text items:
      game.add.text(
        this.x,
        0,
        'Welcome, Adventurer!',
        this.textStyle
      );
      game.add.text(
        this.x,
        30,
        'HP:',
        this.textStyle
      );
      game.add.text(
        this.x,
        50,
        'Attack:',
        this.textStyle
      );
      game.add.text(
        this.x,
        70,
        'Defense:',
        this.textStyle
      );
      game.add.text(
        this.x,
        110,
        'Quest:',
        this.textStyle
      );

      game.add.text(
        this.x,
        200,
        'WASD or arrow keys to move.',
        this.textStyle
      );

      // Text items with dynamic values:
      var valuesX = this.x + 120;
      this.hpDisplay = game.add.text(
        valuesX,
        30,
        '',
        this.textStyle
      );
      this.attackDisplay = game.add.text(
        valuesX,
        50,
        '',
        this.textStyle
      );
      this.defenseDisplay = game.add.text(
        valuesX,
        70,
        '',
        this.textStyle
      );
      this.questDisplay = game.add.text(
        this.x + 10,
        130,
        '',
        this.textStyle
      );

      this.update();

      game.sidebar = this;
    },
    update: function() {
      var player = game.actors['player'];
      this.hpDisplay.text = player.currentHP + '/' + player.maxHP;
      this.attackDisplay.text = player.attack;
      this.defenseDisplay.text = player.defense;

      this.questDisplay.text = game.worldState.currentQuest;
    },
  };

  var Bottombar = {
    init: function() {
      this.messageDisplay = game.add.text(
        10,
        NUM_ROWS * TILE_SIZE + 10,
        '',
        {
          font: '15px monospace',
          fill: '#fff',
        }
      );
      game.bottombar = this;
    },
    update: function() {
      this.messageDisplay.text = game.worldState.messages.slice(-3).join('\n');
    },
  };

  function create() {
    initializeScreen();

    game.worldState = {
      currentQuest: 'Kill the (B)addie!',
      messages: []
    };

    game.map = generateMap();
    game.actors = {};
    generateActors();

    updateScreen();

    Sidebar.init();
    Bottombar.init();

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
    Actor.create(
      'player',
      '@',
      'you',
      {
        maxHP: 100,
        attack: 10,
        defense: 0,
      },
      {
        x: getRandomInt(1, 4),
        y: getRandomInt(1, 4),
      }
    );
    Actor.create(
      'enemy',
      'B',
      'the big baddie',
      {
        maxHP: 75,
        attack: 5,
        defense: 1,
      },
      {
        x: getRandomInt(NUM_COLS - 3, NUM_COLS - 1),
        y: getRandomInt(NUM_ROWS - 3, NUM_ROWS - 1),
      },
      {
        reactToAttack: function(attacker) {
          if (this.currentHP < 20) {
            var healed = getRandomInt(5, 20);
            this.currentHP = Math.min(this.maxHP, this.currentHP + healed);
            addMessage(capitalize(this.name) + ' mumbles strange words and heals itself for ' + healed + '!');
          } else {
            this.attackTarget(attacker);
          }
        }
      }
    );
  }

  function onKeyUp(event) {
    var player = game.actors['player'];
    switch(event.keyCode) {
      case Phaser.Keyboard.LEFT:
      case Phaser.Keyboard.A:
        player.move({x: -1});
        break;
      case Phaser.Keyboard.RIGHT:
      case Phaser.Keyboard.D:
        player.move({x: 1});
        break;
      case Phaser.Keyboard.UP:
      case Phaser.Keyboard.W:
        player.move({y: -1});
        break;
      case Phaser.Keyboard.DOWN:
      case Phaser.Keyboard.S:
        player.move({y: 1});
        break;
    }
  }

  function initializeScreen() {
    game.screen = [];
    game.actorPositions = [];
    for (var y = 0; y < NUM_ROWS; y++) {
      screenRow = [];
      actorPosRow = [];
      for (var x = 0; x < NUM_COLS; x++) {
        screenRow.push(createTile('.', x, y));
        actorPosRow.push(null);
      }
      game.screen.push(screenRow);
      game.actorPositions.push(actorPosRow);
    }
  }

  function updateScreen() {
    for (var y = 0; y < NUM_ROWS; y++) {
      row = game.map[y];
      for (var x = 0; x < NUM_COLS; x++) {
        game.screen[y][x].text = row[x];
      }
    }
    updateActors();
  }

  function updateActors() {
    for (var name in game.actors) {
      var actor = game.actors[name];
      game.screen[actor.y][actor.x].text = actor.tile;
    }
  }

  function createTile(tile, x, y) {
    return game.add.text(
      x * TILE_SIZE,
      y * TILE_SIZE,
      tile,
      {
        font: TILE_SIZE + 'px monospace',
        fill: '#fff'
      }
    );
  }

  function resetTile(x, y) {
    game.screen[y][x].text = game.map[y][x];
  }

  function addMessage(message) {
    game.worldState.messages.push(message);
    game.bottombar.update();
  }

  function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

}