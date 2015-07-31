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
      this.isGameOver = false;

      Map.generate();
      Actors.init();
      Items.init();

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
      this.isGameOver = true;
      this.setQuest('Sadly, you have perished.\n[R]estart?');
    },
    equipPlayer: function() {
      var player = Actors.getPlayer();
      var item = Items.getByPosition(player.x, player.y);
      if (item && item.equippable) {
        player.equip(item);
      } else {
        WorldState.addMessage("Nothing to equip here.");
      }
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
      // Place items first, then actors.
      var items = Items.getAll();
      this.placeObjects(items);
      var actors = Actors.getAll();
      this.placeObjects(actors);
    },
    placeObjects: function(objects) {
      for (var i = 0; i < objects.length; i++) {
        var object = objects[i];
        this.tiles[object.y][object.x].text = object.tile;
      }
    }
  };

  var Objects = {
    init: function() {
      this.all = [];
      this.byId = {};
      this.byPosition = {};
    },
    methods: [
      'add',
      'setPosition',
      'getByPosition',
      'remove',
    ],
    enable: function(collection) {
      this.init.bind(collection)();
      for (var i = 0; i < this.methods.length; i++) {
        var methodName = this.methods[i];
        collection[methodName] = this[methodName].bind(collection);
      }
    },
    add: function(object) {
      this.all.push(object);
      this.byId[object.id] = object;
    },
    setPosition: function(object, newPosition) {
      if (object.x === null && object.y === null) {
        // This is the initial setting of position.
        // HACK: Just set wherever an object is to a floor tile
        // in case it was a wall.
        Map.set(newPosition.x, newPosition.y, '.');
      } else {
        this.byPosition[key(object.x, object.y)] = null;
      }
      object.x = newPosition.x;
      object.y = newPosition.y;
      this.byPosition[key(object.x, object.y)] = object;
    },
    getByPosition: function(x, y) {
      return this.byPosition[key(x, y)];
    },
    remove: function(object) {
      this.byPosition[key(object.x, object.y)] = null;
      this.all = this.all.filter(function(obj) { return obj.id !== object.id; });
      Screen.resetTile(object.x, object.y);
    }
  };

  var Items = {
    init: function() {
      Objects.enable(this);

      this.generate();
    },
    generate: function() {
      var weapon = Item.create(
        'sword',
        'steel sword',
        Item.types.WEAPON,
        {
          attack: 20,
        }
      );
      this.add(weapon);
      this.setPosition(weapon, {x: getRandomInt(5, 7), y: getRandomInt(5, 7)});
      var armor = Item.create(
        'chain',
        'chain mail',
        Item.types.ARMOR,
        {
          defense: 10,
        }
      );
      this.add(armor);
      this.setPosition(armor, {x: getRandomInt(2, 5), y: getRandomInt(7, 9)});
    },
    getAll: function() {
      return this.all;
    }
  };

  var Item = {
    types: {
      WEAPON: 1,
      ARMOR: 2,
      POTION: 3,
    },
    create: function(id, name, type, options) {
      var item = Object.create(this);
      item.id = id;
      switch (type) {
        case Item.types.WEAPON:
          item.tile = ')';
          item.equippable = true;
          break;
        case Item.types.ARMOR:
          item.tile = ']';
          item.equippable = true;
          break;
        case Item.types.POTION:
          item.tile = '!';
          break;
        default:
          item.tile = '?';
          break;
      }
      item.name = name;
      item.type = type;

      item.x = item.y = null;

      for (var key in options) {
        item[key] = options[key];
      }

      return item;
    },
    createWeapon: function(id, name, attack) {
      return this.create(id, name, Item.types.WEAPON, {attack: attack});
    },
    createArmor: function(id, name, defense) {
      return this.create(id, name, Item.types.ARMOR, {defense: defense});
    },
  };

  var Actors = {
    init: function() {
      Objects.enable(this);

      this.generate();
    },
    generate: function() {
      var player = Actor.create(
        'player',
        '@',
        'you',
        {
          maxHP: 100,
        },
        {
          weapon: Item.createWeapon(
            'dagger',
            'rusty dagger',
            5
          ),
          armor: Item.createArmor(
            'robe',
            'tattered robe',
            1
          ),
          isPlural: true,
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
          maxHP: 200,
        },
        {
          weapon: Item.createWeapon(
            'claws',
            'unspeakable claws',
            30
          ),
          armor: Item.createArmor(
            'hide',
            'natural hide',
            5
          ),
          lastCantrip: -1,
          reactToAttack: function(attacker) {
            if (this.currentHP < 20 && Math.random() > 0.4) {
              var healed = getRandomInt(15, 30);
              this.currentHP = Math.min(this.maxHP, this.currentHP + healed);
              WorldState.addMessage(capitalize(this.name) + ' mumbles strange words and heals itself for ' + healed + '!');
            } else if (Math.random() > 0.5) {
              // Half the time, the baddie just does nothing.
              var cantrips = [
                ' seems to find amusement in just staring you down. You shiver.',
                ' growls menacingly, but just stands there.',
                ' suddenly swats at a cave fly buzzing around its head.',
                ' begins to emit an eerie glow, though it soon fades.',
                ' snorts and stamps its heavy feet.',
                ' is distracted by a distant sound.',
                ' cackles!',
                ' seems to grow a little bit bored with you.',
              ];
              // Inelegant way to prevent repetitions.
              var nextCantrip = this.lastCantrip;
              while (nextCantrip === this.lastCantrip) {
                nextCantrip = getRandomInt(0, cantrips.length);
              }
              WorldState.addMessage(capitalize(this.name) + cantrips[nextCantrip]);
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
      var target = this.getByPosition(x, y);
      if (target) {
        actor.attackTarget(target);
        if (target.isAlive()) {
          target.reactToAttack(actor);
        }
      } else if (Map.get(x, y) === '.' &&
          y >= 0 && y < NUM_ROWS &&
          x >= 0 && x < NUM_COLS) {
        this.setPosition(actor, {x: x, y: y});
        var item = Items.getByPosition(x, y);
        if (item) {
          var message = "You see here: " + item.name + ".";
          if (item.equippable) {
            message += " [E]quip it?";
          }
          WorldState.addMessage(message);
        }

        if (actor.id === 'player') {
          // HACK: Enemy movement shouldn't be tied to player movement directly.
          // There should probably be some other model of "time passing" and
          // other actor being able to (re)act.
          var enemy = this.getById('enemy');
          var seed = getRandomInt(0, 4);
          var enemyDir;
          switch (seed) {
            case 0:
              enemyDir = {x: 1, y: 0};
              break;
            case 1:
              enemyDir = {x: -1, y: 0};
              break;
            case 2:
              enemyDir = {x: 0, y: 1};
              break;
            case 3:
              enemyDir = {x: 0, y: -1};
              break;
          }
          this.move(enemy, enemyDir);
        }

        Screen.update();
      }
    },
    kill: function(actor) {
      this.remove(actor);

      if (actor.id == 'player') {
        WorldState.gameOver();
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

      actor.weapon = {
        name: '-',
        attack: 0,
      };
      actor.armor = {
        name: '-',
        defense: 0,
      };

      actor.x = actor.y = null;

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
    attack: function() {
      return this.weapon.attack;
    },
    defense: function() {
      return this.armor.defense;
    },
    attackTarget: function(target) {
      var damage = Math.ceil(this.attack() * (1.2 - Math.random()*0.4)) - target.defense();
      target.currentHP = Math.max(0, target.currentHP - damage);
      var message = capitalize(this.name) + ' hit ' + target.name + ' for ' + damage + ' damage!';
      WorldState.addMessage(message);
      if (target.isAlive()) {
        var percentHP = target.currentHP / target.maxHP;
        var verb = target.isPlural ? 'are' : 'is';
        if (percentHP < 0.25) {
          WorldState.addMessage(capitalize(target.name) + ' ' + verb + ' bleeding profusely.');
        } else if (percentHP < 0.5) {
          WorldState.addMessage(capitalize(target.name) + ' ' + verb + ' breathing heavily.');
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
    equip: function(item) {
      if (item.type === Item.types.WEAPON) {
        this.weapon = item;
        Items.remove(item);
      } else if (item.type === Item.types.ARMOR) {
        this.armor = item;
        Items.remove(item);
      }
      Sidebar.update();
      Screen.update();
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
        100,
        'Weapon:',
        this.textStyle
      );
      game.add.text(
        this.x,
        120,
        'Armor:',
        this.textStyle
      );
      game.add.text(
        this.x,
        150,
        'Quest:',
        this.textStyle
      );

      game.add.text(
        this.x,
        240,
        'WASD or arrow keys to move.',
        this.textStyle
      );

      // Text items with dynamic values:
      var valuesX = this.x + 80;
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
      this.weaponDisplay = game.add.text(
        valuesX,
        100,
        '',
        this.textStyle
      );
      this.armorDisplay = game.add.text(
        valuesX,
        120,
        '',
        this.textStyle
      );
      this.questDisplay = game.add.text(
        this.x + 10,
        170,
        '',
        this.textStyle
      );
    },
    update: function() {
      var player = Actors.getPlayer();
      this.hpDisplay.text = player.currentHP + '/' + player.maxHP;
      this.attackDisplay.text = player.attack();
      this.defenseDisplay.text = player.defense();

      this.weaponDisplay.text = capitalize(player.weapon.name);
      this.armorDisplay.text = capitalize(player.armor.name);

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
      case Phaser.Keyboard.E:
        WorldState.equipPlayer();
        break;
    }
  }

  function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  function key(x, y) {
    return x + ':' + y;
  }
}