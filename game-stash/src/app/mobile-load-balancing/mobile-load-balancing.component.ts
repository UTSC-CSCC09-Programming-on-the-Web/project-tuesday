import { AfterViewInit, Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import Matter, { Engine, Runner, Render, World, Constraint, MouseConstraint, Bodies, Mouse, Events, Body} from 'matter-js'
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PlayerSocketService } from '../services/player.socket.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mobile-load-balancing',
  imports: [CommonModule],
  templateUrl: './mobile-load-balancing.component.html',
  styleUrl: './mobile-load-balancing.component.css'
})
export class MobileLoadBalancingComponent implements AfterViewInit {

  lobbyCode = signal('');
  selectedGame = signal('');
  playerName = signal('');
  roundNumber = signal(5);

  @ViewChild('gameWrapper') wrapper!: ElementRef;

  width: number = 350;
  height: number = 500;

  engine: Engine = Engine.create();
  render: Render | undefined;

  points: number = 0;
  bodies: Matter.Body[] = [];
  platform: Matter.Body | undefined;

  subscriptions: Subscription[] = [];

  gyroscope: number[] = [0, 0, 0];
  permissionGranted: boolean = false;

  rotation: number = 0;
  old: number = 0;
  //linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  colours: string[] = ["#667eea", "#6c6ae4", "#7260dd", "#7856d7", "#764ba2"]

  get score(): number {
    return this.points;
  }

  constructor(
    private socketService: PlayerSocketService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngAfterViewInit() {
    document.querySelector('#permission')!.addEventListener('click', () => {
  this.socketService.playerEmit("ping", "permission clicked for device motion");

  // Check if iOS-style permission request is needed
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as any).requestPermission === 'function'
  ) {
    (DeviceMotionEvent as any).requestPermission().then((response: any) => {
      this.socketService.playerEmit("ping", "permission granted!");
      this.permissionGranted = response === 'granted';
      if (this.permissionGranted) {
        this.startMotionListener();
      }
      this.runGame();
    }).catch((error: any) => alert(error));
  } else {
    // seems like for Android some older browsers don't ask you for permission lol
    this.permissionGranted = true;
    this.startMotionListener();
    this.runGame();
  }
});

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
  }

  runGame() {
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

    this.platform = Bodies.rectangle(this.width / 2, this.height - 20, this.width - 10, 20, {
        isStatic: true,
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

    //this.engine.gravity.y = 0; // Set gravity to 0.5 for a more dynamic effect

    World.add(this.engine.world, [this.platform, mouseConstraint]);
    const runner = Runner.create();
    Runner.run(runner, this.engine);
    Render.run(this.render);

    console.log("Game started");

    this.socketService.playerEmit("playerStart", {});

    Events.on(this.engine, "afterUpdate", () => {;
      if (this.permissionGranted) {
        Body.rotate(this.platform!, (this.rotation - this.old) * Math.PI / 180);
      }
      this.bodies.forEach(body => {
        if (body.position.y > this.height || body.position.x < 0 || body.position.x > this.width) {

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
      const box = Bodies.circle(data.x, data.y, data.size / 2, {
        isStatic: true,
        render: {
          fillStyle: 'rgba(255, 255, 255, 0.1)',
          strokeStyle: 'rgba(255, 255, 255, 0.8)',
          lineWidth: 2
        },
        collisionFilter: {
          category: 0x0002,
          mask: 0x0000
        }
      });
      World.add(this.engine.world, box);
      setTimeout(() => {
        World.remove(this.engine.world, box);
        const newBox = Bodies.circle(data.x, data.y, data.size / 2, {render: {
          fillStyle: this.colours[Math.round(Math.random() * this.colours.length)],
          strokeStyle: 'rgba(255, 255, 255, 0.8)',
          lineWidth: 2
        }});
        this.bodies.push(newBox);
        World.add(this.engine.world, newBox);
      }, 1000);
    });

    this.socketService.useEffect("gameEnded", (data) => {
      console.log("Game ended:", data);
      if (this.render) {
        Render.stop(this.render);
      }
      if (this.engine) {
        Engine.clear(this.engine);
      }

      this.socketService.removeEffect("spawnBox");
      this.socketService.removeEffect("gameEnded");
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

  startMotionListener() {
  window.addEventListener('deviceorientation', event => {
    this.socketService.playerEmit("ping", "Hello from the frontend!");
    this.old = this.rotation;
    this.rotation = Math.floor(event.gamma || 0);
  });
}

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.render) {
      Render.stop(this.render);
    }
    if (this.engine) {
      Engine.clear(this.engine);
    }
    this.socketService.removeEffect("spawnBox");
    this.socketService.removeEffect("gameEnded");
    console.log("MobileLoadBalancingComponent destroyed");
  }
}
