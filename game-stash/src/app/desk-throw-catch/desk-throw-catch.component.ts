import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  signal,
} from '@angular/core';
import { AdminSocketService } from '../services/admin.socket.service';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Render,
  Engine,
  Bodies,
  Body,
  Runner,
  World,
  Mouse,
  MouseConstraint,
  Events,
} from 'matter-js';

import { Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '../services/socket.service.constants';
import { map } from 'rxjs';
import { GlobalRankingService } from '../services/global-ranking.service';

interface PlayerPoint {
  player: Player;
  points: number | undefined;
}

@Component({
  selector: 'app-desk-throw-catch',
  imports: [CommonModule],
  templateUrl: './desk-throw-catch.component.html',
  styleUrl: './desk-throw-catch.component.css',
})

export class DeskThrowCatchComponent implements AfterViewInit {
  @ViewChild('gameWrapper') wrapper!: ElementRef;
  @ViewChild('spawnButton') spawnButton!: ElementRef;

  @Output() gameOver = new EventEmitter<string>();

  // for game state metadata
  selectedGame = signal('');
  status = signal('');
  players = signal([] as PlayerPoint[]);
  responded: Player[] = [];
  unresponded: Player[] = [];

  currentThrower = signal('');

  // for rendering
  engine: Engine = Engine.create();
  render: Render | undefined;

  width: number = 500;
  height: number = 250;

  // rendering objects in the game
  platform: Matter.Body | undefined;
  bodies: Matter.Body[] = [];

  // for rendering goal pole
  pole: Matter.Body | undefined;
  poleWidth = 10;
  poleHeight = 50;

  // for keeping track of the current ball
  ballGuide: Matter.Body | undefined;
  ball: Matter.Body | undefined;
  hasReadStopped: boolean = false;
  currentPlayerId: string = '';
  colours: string[] = ['#667eea', '#6c6ae4', '#7260dd', '#7856d7', '#764ba2'];

  constructor(
    private socketService: AdminSocketService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    socketService.useEffect('playersReady', (arg) => {
      socketService.lobbyEmit('queryNextPlayerThrow', {});
    });

    socketService.useEffect('playerThrowData', (arg) => {
      // simulate the throw
      if (arg.throwData === -1) {
        console.log('Game ended, sending gameEnded event', this.players());

        console.log(this.players());

        this.socketService.lobbyEmit('gameEnded', {
          gameId: 'Throw and Catch',
          players: this.players(), //doesnt have points attached to it
          // points: this.points,
        });

        console.log('Game ended');
        this.status.set('Game Over');
      } else {
        this.currentPlayerId = arg.playerId;
        this.bodies.push(this.spawnBall(arg.playerId, arg.throwData));
      }
    });

    socketService.useEffect('nextPlayerId', (arg) => {
      this.players().forEach((player) => {
        if (player.player.playerId === arg.playerId) {
          this.currentThrower.set(player.player.name);
        }
      });
    })
  }

  ngOnInit() {
    this.socketService.gameState$
          .pipe(map((gameState) => gameState.playerRankings))
          .subscribe((players) => {
            this.players.set(
              players.map((player) => {
                return {
                  player: player.player,
                  points: Math.abs(Math.trunc(player.data!)),
                };
              }),
            );
            this.responded = players
              .filter((players) => players.data !== undefined)
              .map((player) => player.player);
            this.unresponded = this.players()
              .filter(
                (player) =>
                  !this.responded.find(
                    (res) => res.playerId === player.player.playerId,
                  ),
              )
              .map((player) => player.player);
            if (
              this.unresponded.length === 0 &&
              this.status() === 'Waiting for players'
            ) {
              this.status.set('Game Countdown');
              //this.startCountdown(this.startGame.bind(this));
            }
          });

    console.log(this.players());
  }

  ngAfterViewInit() {
    this.socketService.lobbyEmit('startGame', { gameId: 'Throw and Catch' });
    this.renderScreen();
    this.pole = this.spawnGoal();
    this.ballGuide = this.spawnBallGuide();
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
      },
    });

    this.platform = Bodies.rectangle(
      this.height,
      this.height,
      this.width,
      25,
      {
        isStatic: true,
      },
    );

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
          visible: false,
        },
      },
    });

    this.render.mouse = mouse;

    // Start running the game
    World.add(this.engine.world, [this.platform, mouseConstraint]);
    Render.run(this.render);
    const runner = Runner.create();
    Runner.run(runner, this.engine);

    Events.on(this.engine, 'afterUpdate', () => {
      if (this.ball) {
        if (this.ball.position.y > this.platform!.position.y && !this.hasReadStopped) {
          console.log('ball has fallen below the platform');
          this.hasReadStopped = true;

          this.socketService.lobbyEmit('queryNextPlayerThrow', {
            previousPlayerId: this.currentPlayerId,
            throwDistance: this.ball.position.x - this.pole!.position.x,
          })

          // if the ball falls below the platform, remove it
          World.remove(this.engine.world, this.ball);
        }

        if (this.ball.velocity.x === 0 && !this.hasReadStopped) {
          console.log('ball has stopped moving');
          this.hasReadStopped = true;

          this.socketService.lobbyEmit('queryNextPlayerThrow', {
            previousPlayerId: this.currentPlayerId,
            throwDistance: this.ball.position.x - this.pole!.position.x,
          });
        }
      }
    });
  }

  gameOverEmit() {
    this.gameOver.emit('Magic Number');
  }

  // spawn a goalpost
  spawnGoal() {
    const platformPos = this.platform!.position;

    const poleX = platformPos.x;
    const poleY = platformPos.y - this.poleHeight / 2 - 12; // 10 is half the platform height

    const locationX = Math.random() * 2 * poleX;

    const pole = Bodies.rectangle(
      locationX,
      poleY,
      this.poleWidth,
      this.poleHeight,
      {
        isStatic: true,
        render: {
          fillStyle: '#E5DF2B',
          strokeStyle: '#E5DF2B'
        }
      },
    );

    pole.isSensor = true;
    World.add(this.engine.world, pole);

    const poleHead = Bodies.circle(locationX, poleY - 25, 5, {
      isStatic: true,
      render: {
        fillStyle: '#E5DF2B',
          strokeStyle: '#E5DF2B'
      },
    })
    World.add(this.engine.world, poleHead);

    return pole;
  }

  spawnBallGuide() {
    const platformPos = this.platform!.position;
    const poleX = platformPos.x;
    const poleY = platformPos.y - this.poleHeight / 2 - 10; // 10 is half the platform height

    const ballGuide = Bodies.circle(poleX, poleY - 60, 5, {
        isStatic: true,
        render: {
          fillStyle: 'rgba(255, 255, 255, 0.0)',
          strokeStyle: 'rgba(255, 255, 255, 1.0)',
          lineWidth: 1,
        }
      });

    ballGuide.collisionFilter = {
        group: -1, // prevent collision with other balls in same group
        category: 0x0002, // it's a ball
        mask: 0x0001, // only collide with platform
      };

    World.add(this.engine.world, ballGuide);

    return ballGuide;
  }

  // spawn a ball
  spawnBall(playerId: string, throwForce: { x: number; y: number }) {
    console.log('spawning a ball');
    console.log(throwForce);
    this.hasReadStopped = false;
    const platformPos = this.platform!.position;

    const poleX = platformPos.x;
    const poleY = platformPos.y - this.poleHeight / 2 - 10; // 10 is half the platform height

    // remove collision on previous ball
    if (this.ball) {
      this.ball.collisionFilter = {
        group: -1, // prevent collision with other balls in same group
        category: 0x0002, // it's a ball
        mask: 0x0001, // only collide with platform
      };
    }
    this.currentPlayerId = playerId;

    //change current ball to this one
    this.ball = Bodies.circle(poleX, poleY - 60, 5, {
      render: {
        fillStyle:
              this.colours[Math.round(Math.random() * this.colours.length)],
        strokeStyle: 'rgba(255, 255, 255, 0.8)',
        lineWidth: 3,
      }
    });
    this.ball.friction = 1;

    this.ball.collisionFilter = {
      group: -1, // same negative group = no collision with old ball
      category: 0x0002, // it's a ball
      mask: 0x0001, // only collide with platform
    };

    //force vector
    Body.applyForce(this.ball, this.ball.position, {
      x: throwForce.x / 100,
      y: throwForce.y / 100,
    });

    World.add(this.engine.world, this.ball);

    return this.ball;
  }

  clearScreen() {
    for (const body of this.bodies) {
      World.remove(this.engine.world, body);
    }
  }

  ngOnDestroy() {
    this.socketService.removeEffect('playersReady');
    this.socketService.removeEffect('playerThrowData');

    if (this.render) {
      Render.stop(this.render);
    }

    console.log('DeskLoadBalancingComponent destroyed');
  }
}
