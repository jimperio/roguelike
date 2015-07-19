var TILE_SIZE = 30;
var NUM_ROWS = 10;
var NUM_COLS = 15;


function init(parent) {
  var state = {
    create: create,
  };

  var game = new Phaser.Game(
    NUM_COLS * TILE_SIZE,
    NUM_ROWS * TILE_SIZE,
    Phaser.AUTO,
    parent,
    state,
    false,
    false
  );

  function create() {
    initializeScreen();
    map = generateMap();
    player = {
      x: Math.ceil(Math.random() * 3),
      y: Math.ceil(Math.random() * 3),
    };
    // HACK: Just set wherever the player is to a floor tile
    // in case it was a wall.
    map[player.y][player.x] = '.';
    updateScreen();

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
    for (var y = 0; y < NUM_ROWS; y++) {
      screenRow = [];
      for (var x = 0; x < NUM_COLS; x++) {
        screenRow.push(createTile('.', x, y));
      }
      gameScreen.push(screenRow);
    }
  }

  function updateScreen() {
    for (var y = 0; y < NUM_ROWS; y++) {
      row = map[y];
      for (var x = 0; x < NUM_COLS; x++) {
        gameScreen[y][x].text = row[x];
      }
    }
    gameScreen[player.y][player.x].text = '@';
  }

  function movePlayer(dir) {
    x = player.x + (dir.x || 0);
    y = player.y + (dir.y || 0);
    if (map[y][x] === '.' &&
        y >= 0 && y < NUM_ROWS &&
        x >= 0 && x < NUM_COLS) {
      player.x = x;
      player.y = y;
      updateScreen();
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
}