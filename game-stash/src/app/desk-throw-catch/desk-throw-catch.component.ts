import { Component, AfterViewInit, ViewChild, ElementRef, signal } from '@angular/core';
import { AdminSocketService } from '../services/admin.socket.service';
import { Render, Engine, Bodies, Body, Runner, World, Mouse, MouseConstraint, Events } from 'matter-js';

@Component({
  selector: 'app-desk-throw-catch',
  imports: [],
  templateUrl: './desk-throw-catch.component.html',
  styleUrl: './desk-throw-catch.component.css'
})
export class DeskThrowCatchComponent implements AfterViewInit {
  @ViewChild('gameWrapper') wrapper!: ElementRef;
  @ViewChild('spawnButton') spawnButton!: ElementRef;

  selectedGame = signal('');

  // for rendering
  engine: Engine = Engine.create();
  render: Render | undefined;

  width: number = 600;
  height: number = 250;

  // rendering objects in the game
  platform: Matter.Body | undefined;

  // for rendering goal pole
  pole: Matter.Body | undefined;
  poleWidth = 10;
  poleHeight = 50;

  // for keeping track of the current ball
  ball: Matter.Body | undefined;
  hasReadStopped: boolean = false;
  currentPlayerId: string = '';

  constructor (private socketService: AdminSocketService) {
    /*
    socketService.useEffect("playersReady", (arg) => {
      socketService.lobbyEmit("queryNextPlayerThrow", {})
  })
      */


  socketService.useEffect("playerThrowData", (arg) => {
    // simulate the throw
    this.currentPlayerId = arg.playerId;
    this.spawnBall(arg.playerId, arg.throwData);
  })


  socketService.useEffect("gameResults", (arg) => {
    console.log("EVERYONE HAS THROWN------------------")
    // handle results, display on ui

    console.log("results: ", arg)
    //end game
    socketService.emitGameEnded()
  })
  }

  ngAfterViewInit() {
    this.socketService.startGame("Throw and Catch");
    this.renderScreen()
    this.pole = this.spawnGoal();

    this.spawnButton.nativeElement.addEventListener('click', () => {
      this.spawnBall("dummy id", { x: 0.001, y: -0.002 });
    })

  }

  // render the landscape, with a goalpost
  renderScreen() {
    console.log(this.wrapper);
    this.render = Render.create({
          element: this.wrapper.nativeElement,
          engine: this.engine,
          options: {
            width: this.width,
            height: this.height,
            wireframes: false,
            background: 'transparent',
          }
        });
  
    this.platform = Bodies.rectangle(this.width / 2, this.height, this.width, 25, {
      isStatic: true,
    });

    this.platform.collisionFilter = {
      group: 0,
      category: 0x0001,
      mask: 0x0002, // only collide with balls
    };


    const mouse = Mouse.create(this.render.canvas);
        const mouseConstraint = MouseConstraint.create(this.engine, {
          mouse: mouse,
          constraint: {
            render: {
              visible: false
            }
          }});
    
        this.render.mouse = mouse;

    // Start running the game
    World.add(this.engine.world, [this.platform, mouseConstraint]);
    Render.run(this.render);
    const runner = Runner.create();
    Runner.run(runner, this.engine);
    
    Events.on(this.engine, "afterUpdate", () => {
      if (this.ball) {
        console.log (this.hasReadStopped)
        if (this.ball.velocity.x === 0 && !this.hasReadStopped) {
          console.log("ball has stopped moving")
          this.hasReadStopped = true;

          this.socketService.lobbyEmit("queryNextPlayerThrow", {
            previousPlayerId: this.currentPlayerId,
            throwDistance: this.ball.position.x - this.pole!.position.x
          })
        }
      }
    });
  }

  // spawn a goalpost
  spawnGoal() {
    const platformPos = this.platform!.position;

    const poleX = platformPos.x;
    const poleY = platformPos.y - this.poleHeight / 2 - 10; // 10 is half the platform height

    const locationX = Math.random() * 2 * poleX

    const pole = Bodies.rectangle(locationX, poleY, this.poleWidth, this.poleHeight, {
      isStatic: true,
    });

    pole.isSensor = true;
    World.add(this.engine.world, pole);

    return pole;
  }

  // spawn a ball
  spawnBall(playerId: string, throwForce: { x: number, y: number }) {
    console.log("spawning a ball")
    this.hasReadStopped = false;
    const platformPos = this.platform!.position;

    const poleX = platformPos.x;
    const poleY = platformPos.y - this.poleHeight / 2 - 10; // 10 is half the platform height

    // remove collision on previous ball
    if (this.ball) {
      this.ball.collisionFilter = {
        group: -1,          // prevent collision with other balls in same group
        category: 0x0002,   // it's a ball
        mask: 0x0001,       // only collide with platform
      };
    }
    this.currentPlayerId = playerId;

    //change current ball to this one
    this.ball = Bodies.circle(poleX, poleY - 60, 5);
    this.ball.friction = 1;

    this.ball.collisionFilter = {
      group: -1,          // same negative group = no collision with old ball
      category: 0x0002,   // it's a ball
      mask: 0x0001,       // only collide with platform
    };

    //force vector
    Body.applyForce(this.ball, this.ball.position, throwForce)

    World.add(this.engine.world, this.ball);

    return this.ball
  }

  
}
