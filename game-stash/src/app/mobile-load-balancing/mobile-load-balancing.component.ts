import { AfterViewInit, Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { Engine, Runner, Render, World, Constraint, MouseConstraint, Bodies, Mouse, Events, Body} from 'matter-js'
import { SocketService } from '../services/socket.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mobile-load-balancing',
  imports: [],
  templateUrl: './mobile-load-balancing.component.html',
  styleUrl: './mobile-load-balancing.component.css'
})
export class MobileLoadBalancingComponent implements AfterViewInit {

  lobbyCode = signal('');
  selectedGame = signal('');
  playerName = signal('');
  roundNumber = signal(5);

  @ViewChild('gameWrapper') wrapper!: ElementRef;

  width: number = 600;
  height: number = 800;

  engine: Engine = Engine.create();
  render: Render | undefined;

  points: number = 0;
  bodies: Matter.Body[] = [];

  subscriptions: Subscription[] = [];

  get score(): number {
    return this.points;
  }

  constructor(
    private socketService: SocketService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngAfterViewInit() {
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        const lobbyCode = params['lobbyCode'];
        const playerName = params['playerName'];
        const roundNumber = params['roundNumber'];
        const selectedGame = params['selectedGame'] || 'Load Balancing';

        if (!lobbyCode || !playerName) {
          console.error('Load Balancing: Missing required parameters');
          this.router.navigate(['/mobile-join-lobby']);
          return;
        }

        this.lobbyCode.set(lobbyCode);
        this.playerName.set(playerName);
        this.roundNumber.set(roundNumber ? parseInt(roundNumber) : 1);
        this.selectedGame.set(selectedGame);

        console.log('Load Balancing: Loaded parameters', {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          roundNumber: this.roundNumber(),
          selectedGame: this.selectedGame()
        });
      })
    );

    console.log(this.wrapper);
    this.render = Render.create({
      element: this.wrapper.nativeElement,
      engine: this.engine,
      options: {
        width: this.width,
        height: this.height,
        wireframes: false,
        background: 'lightblue',
      }
    });

    const ground = Bodies.rectangle(this.width / 2, this.height - 20, this.width - 10, 60, {
        isStatic: false,
        frictionAir: 1,
        density: 100,
    });

    const mouse = Mouse.create(this.render.canvas);
    const mouseConstraint = MouseConstraint.create(this.engine, {
      mouse: mouse,
      constraint: {
        render: {
          visible: false
        }
      }});

    this.render.mouse = mouse;

    this.engine.gravity.y = 0; // Set gravity to 0.5 for a more dynamic effect

    World.add(this.engine.world, [ground, mouseConstraint]);
    const runner = Runner.create();
    Runner.run(runner, this.engine);
    Render.run(this.render);

    this.runGame();

  }

  runGame() {
    // This method can be used to start the game logic or handle user interactions
    console.log("Game started");

    this.socketService.playerEmit("playerStart", {});

    Events.on(this.engine, "afterUpdate", () => {
      this.bodies.forEach(body => {
        if (body.position.y > this.height || body.position.x < 0 || body.position.x > this.width) {
          // Remove bodies that fall below the screen
          World.remove(this.engine.world, body);
          this.bodies = this.bodies.filter(b => b !== body);
          console.log("Body removed:", body, this.bodies.length);
        } else {
          Body.applyForce(body, body.position, {x: 0, y: body.mass * 0.0001});
        }
      });
      const points = this.bodies.length;
      if (points !== this.points) {
        console.log("Points updated:", points);
        this.points = points;
        this.socketService.playerEmit("scoreUpdate", {
          points: this.points
        });
      }
    });

    this.socketService.useEffect("spawnBox", (data) => {
      console.log(data);
      const box = Bodies.circle(data.x, data.y, data.size / 2);
      this.bodies.push(box);
      World.add(this.engine.world, box);
    });

    this.socketService.useEffect("gameEnded", (data) => {
      console.log("Game ended:", data);
      if (this.render) {
        Render.stop(this.render);
      }
      if (this.engine) {
        Engine.clear(this.engine);
      }
      this.router.navigate(['/mobile-rankings'], {
        queryParams: {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          selectedGame: 'Load Balancing',
          roundNumber: 5,
          guess: 0 // Not used in Load Balancing, but required for consistency
        }
      });
    });

    // setInterval(() => {
    //   // Example of a game action after 5 seconds
    //   console.log("Game action executed after 5 seconds");

    //   const x = Math.random() * this.width;
    //   const y = Math.random() * 100;
    //   const size = Math.random() * 50 + 20;
    //   const box = Bodies.rectangle(x, y, size, size);
    //   this.bodies.push(box);
    //   // World.add(this.engine.world, box);
    // }, 3000);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.render) {
      Render.stop(this.render);
    }
    if (this.engine) {
      Engine.clear(this.engine);
    }
    console.log("MobileLoadBalancingComponent destroyed");
  }
}
