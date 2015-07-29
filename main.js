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
    WorldState.init();

    game.input.keyboard.addCallbacks(null, null, onKeyUp);
  }

  var WorldState = {
    init: function() {
      Screen.init();
      Sidebar.init();
      Bottombar.init();
      this.reset();
    },
    reset: function() {
      this.currentQuest = 'Kill the (B)addie!';
      this.messages = [];
      this.gameOver = false;

      Map.generate();
      Actors.init();
      Screen.update();

      this.addMessage('You feel a weirdly familiar disorientation.');

      Sidebar.update();
      Bottombar.update();
    },
    addMessage: function(message) {
      this.messages.push(message);
      Bottombar.update();
    },
    setQuest: function(newQuest) {
      this.currentQuest = newQuest;
      Sidebar.update();
    },
    gameOver: function() {
      this.gameOver = true;
    },
  };

  var Map = {
    generate: function() {
      this.map = [];
      for (var y = 0; y < NUM_ROWS; y++) {
        mapRow = [];
        for (var x = 0; x < NUM_COLS; x++) {
          var threshold = 0.15;
          var wallAbove = y > 0 && this.map[y-1][x] === '#';
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
        this.map.push(mapRow);
      }
    },
    get: function(x, y) {
      return this.map[y][x];
    },
    set: function(x, y, value) {
      this.map[y][x] = value;
    },
  };

  var Screen = {
    init: function() {
      this.tiles = [];
      for (var y = 0; y < NUM_ROWS; y++) {
        screenRow = [];
        for (var x = 0; x < NUM_COLS; x++) {
          screenRow.push(this.createTile('.', x, y));
        }
        this.tiles.push(screenRow);
      }
    },
    createTile: function(tile, x, y) {
      return game.add.text(
        x * TILE_SIZE,
        y * TILE_SIZE,
        tile,
        {
          font: TILE_SIZE + 'px monospace',
          fill: '#fff'
        }
      );
    },
    resetTile: function(x, y) {
      this.tiles[y][x].text = Map.get(x, y);
    },
    update: function() {
      for (var y = 0; y < NUM_ROWS; y++) {
        for (var x = 0; x < NUM_COLS; x++) {
          this.tiles[y][x].text = Map.get(x, y);
        }
      }
      var actors = Actors.getAll();
      for (var i = 0; i < actors.length; i++) {
        var actor = actors[i];
        this.tiles[actor.y][actor.x].text = actor.tile;
      }
    },
  };

  var Actors = {
    init: function() {
      this.all = [];
      this.byId = {};
      this.byPosition = {};

      this.generate();
    },
    generate: function() {
      var player = Actor.create(
        'player',
        '@',
        'you',
        {
          maxHP: 100,
          attack: 10,
          defense: 0,
        }
      );
      this.add(player);
      this.setPosition(player, {
        x: getRandomInt(1, 4),
        y: getRandomInt(1, 4),
      });

      var enemy = Actor.create(
        'enemy',
        'B',
        'the big baddie',
        {
          maxHP: 75,
          attack: 25,
          defense: 1,
        },
        {
          reactToAttack: function(attacker) {
            if (this.currentHP < 20) {
              var healed = getRandomInt(5, 20);
              this.currentHP = Math.min(this.maxHP, this.currentHP + healed);
              WorldState.addMessage(capitalize(this.name) + ' mumbles strange words and heals itself for ' + healed + '!');
            } else {
              this.attackTarget(attacker);
            }
          }
        }
      );
      this.add(enemy);
      this.setPosition(enemy, {
        x: getRandomInt(NUM_COLS - 3, NUM_COLS - 1),
        y: getRandomInt(NUM_ROWS - 3, NUM_ROWS - 1),
      });
    },
    add: function(actor) {
      this.all.push(actor);
      this.byId[actor.id] = actor;
    },
    getById: function(id) {
      return this.byId[id];
    },
    getPlayer: function() {
      return this.getById('player');
    },
    movePlayer: function(dir) {
      var player = this.getPlayer();
      if (player.isAlive()) {
        this.move(player, dir);
      }
    },
    move: function(actor, dir) {
      x = actor.x + (dir.x || 0);
      y = actor.y + (dir.y || 0);
      target = this.getByPosition(x, y);
      if (target) {
        actor.attackTarget(target);
        if (target.isAlive()) {
          target.reactToAttack(actor);
        }
      } else if (Map.get(x, y) === '.' &&
          y >= 0 && y < NUM_ROWS &&
          x >= 0 && x < NUM_COLS) {
        this.setPosition(actor, {x: x, y: y});
        Screen.update();
      }
    },
    setPosition: function(actor, newPosition) {
      if (actor.x === null && actor.y === null) {
        // This is the initial setting of position.
        // HACK: Just set wherever an actor is to a floor tile
        // in case it was a wall.
        Map.set(position.x, position.y, '.');
      } else {
        this.byPosition[this.key(actor.x, actor.y)] = null;
      }
      actor.x = newPosition.x;
      actor.y = newPosition.y;
      this.byPosition[this.key(actor.x, actor.y)] = actor;
    },
    getByPosition: function(x, y) {
      return this.byPosition[this.key(x, y)];
    },
    kill: function(actor) {
      this.byPosition[this.key(actor.x, actor.y)] = null;

      Screen.resetTile(actor.x, actor.y);

      if (actor.id == 'player') {
        WorldState.setQuest('Sadly, you have perished.\n(R)estart?');
      }

      if (actor.id === 'enemy') {
        WorldState.setQuest('Escape! [coming soon]');
      }
    },
    getAll: function() {
      return this.all.filter(function(a) { return a.isAlive(); });
    },
    key: function(x, y) {
      return x + ':' + y;
    },
  };

  var Actor = {
    create: function(id, tile, name, stats, options) {
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

      if (options) {
        for (var key in options) {
          actor[key] = options[key];
        }
      }

      return actor;
    },
    isAlive: function() {
      return this.currentHP > 0;
    },
    attackTarget: function(target) {
      var damage = Math.ceil(this.attack * (1.2 - Math.random()*0.4)) - target.defense;
      target.currentHP = Math.max(0, target.currentHP - damage);
      var message = capitalize(this.name) + ' hit ' + target.name + ' for ' + damage + ' damage!';
      WorldState.addMessage(message);
      if (target.isAlive()) {
        var percentHP = target.currentHP / target.maxHP;
        if (percentHP < 0.25) {
          WorldState.addMessage(capitalize(target.name) + ' is bleeding profusely.');
        } else if (percentHP < 0.5) {
          WorldState.addMessage(capitalize(target.name) + ' is breathing heavily.');
        }
      } else {
        Actors.kill(target);
        message = capitalize(this.name) + ' killed ' + target.name + '!';
        WorldState.addMessage(message);
      }
      Sidebar.update();
    },
    reactToAttack: function(attacker) {
      // Default behavior is to just retaliate.
      this.attackTarget(attacker);
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
    },
    update: function() {
      var player = Actors.getPlayer();
      this.hpDisplay.text = player.currentHP + '/' + player.maxHP;
      this.attackDisplay.text = player.attack;
      this.defenseDisplay.text = player.defense;

      this.questDisplay.text = WorldState.currentQuest;
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
    },
    update: function() {
      this.messageDisplay.text = WorldState.messages.slice(-3).join('\n');
    },
  };

  function onKeyUp(event) {
    switch(event.keyCode) {
      case Phaser.Keyboard.LEFT:
      case Phaser.Keyboard.A:
        Actors.movePlayer({x: -1});
        break;
      case Phaser.Keyboard.RIGHT:
      case Phaser.Keyboard.D:
        Actors.movePlayer({x: 1});
        break;
      case Phaser.Keyboard.UP:
      case Phaser.Keyboard.W:
        Actors.movePlayer({y: -1});
        break;
      case Phaser.Keyboard.DOWN:
      case Phaser.Keyboard.S:
        Actors.movePlayer({y: 1});
        break;
      case Phaser.Keyboard.R:
        WorldState.reset();
        break;
    }
  }

  function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

}