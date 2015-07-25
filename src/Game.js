import React from 'react/addons'

var {update} = React.addons

const TILE_SIZE = 50
const NUM_ROWS = 10
const NUM_COLS = 15

const SIDEBAR_WIDTH = 250
const BOTTOMBAR_HEIGHT = 80

var Tile = React.createClass({
  render() {
    let style = {
      fontSize: TILE_SIZE,
      position: 'absolute',
      left: this.props.x * TILE_SIZE,
      top: this.props.y * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      textAlign: 'center',
      lineHeight: TILE_SIZE + 'px',
    }
    return <div style={style}>{this.props.text}</div>
  },
})

export default React.createClass({
  getInitialState() {
    return {
      currentQuest: 'Kill the (B)addie!',
      messages: [],
      gameScreen: {},
    }
  },
  componentDidMount() {
    this.initializeScreen()
      .then(this.generateMap)
      .then(this.generateActors)
      .then(this.updateScreen)
      .catch((err) => {
        console.log(err)
      })
  },
  render() {
    return (
      <div onKeyUp={this.keyUp}>{this.renderGameScreen()}</div>
    )
  },
  renderGameScreen() {
    let tiles = []
    for (let coord in this.state.gameScreen) {
      let tile = this.state.gameScreen[coord]
      tiles.push(<Tile key={coord} {...tile} />)
    }
    return tiles
  },
  initializeScreen() {
    return new Promise((ok) => {
      console.log("Initializing screen...")
      let gameScreen = {}
      this.actorPositions = []
      for (var y = 0; y < NUM_ROWS; y++) {
        let actorPosRow = []
        for (var x = 0; x < NUM_COLS; x++) {
          gameScreen[`${y},${x}`] = {
            text: '.',
            x: x,
            y: y,
          }
          actorPosRow.push(null)
        }
        this.actorPositions.push(actorPosRow)
      }
      this.setState({gameScreen}, ok)
    })
  },
  generateMap() {
    return new Promise((ok) => {
      console.log('Generating map...')
      this.map = []
      for (let y = 0; y < NUM_ROWS; y++) {
        let mapRow = []
        for (let x = 0; x < NUM_COLS; x++) {
          let threshold = 0.15
          let wallAbove = y > 0 && this.map[y-1][x] === '#'
          let wallLeft = x > 0 && mapRow[x-1] === '#'
          if (wallAbove && wallLeft) {
            threshold = 0
          } else if (wallAbove || wallLeft) {
            threshold = 0.3
          }
          let c = (
            y === 0 || y === NUM_ROWS -1 ||
            x === 0 || x === NUM_COLS - 1 ||
            Math.random() < threshold
          ) ? '#' : '.'
          mapRow.push(c)
        }
        this.map.push(mapRow)
      }
      ok()
    })
  },
  generateActors() {
    return new Promise((ok) => {
      console.log("Generating actors...")
      this.actors = {}
      let player = {
        id: 'player',
        tile: '@',
        x: Math.ceil(Math.random() * 3),
        y: Math.ceil(Math.random() * 3),
        currentHP: 100,
        maxHP: 100,
        attack: 10,
        defense: 0,
        name: 'you'
      }
      this.actors[player.id] = player
      let enemy = {
        id: 'enemy',
        tile: 'B',
        x: NUM_COLS - Math.ceil(Math.random() * 2) - 1,
        y: NUM_ROWS - Math.ceil(Math.random() * 2) - 1,
        currentHP: 75,
        maxHP: 75,
        attack: 5,
        defense: 1,
        name: 'the big baddie'
      }
      this.actors[enemy.id] = enemy
      for (var id in this.actors) {
        let actor = this.actors[id]
        // HACK: Just set wherever an actor is to a floor tile
        // in case it was a wall.
        this.map[actor.y][actor.x] = '.';
        this.actorPositions[actor.y][actor.x] = actor
      }
      ok()
    })
  },
  updateScreen() {
    return new Promise((ok) => {
      console.log("Updating screen...")
      let nextGameScreen = {}
      for (let y = 0; y < NUM_ROWS; y++) {
        let row = this.map[y]
        for (let x = 0; x < NUM_COLS; x++) {
          nextGameScreen[`${y},${x}`] = {
            text: {$set: row[x]},
          }
        }
      }
      this.setState({
        gameScreen: update(this.state.gameScreen, nextGameScreen),
      }, ok)
    }).then(this.updateActors)
  },
  updateActors() {
    return new Promise((ok) => {
      console.log("Updating actors...")
      let nextGameScreen = {}
      for (let name in this.actors) {
        let actor = this.actors[name]
        nextGameScreen[`${actor.y},${actor.x}`] = {
          text: {$set: actor.tile},
        }
      }
      this.setState({
        gameScreen: update(this.state.gameScreen, nextGameScreen),
      }, ok)
    })
  },
})

