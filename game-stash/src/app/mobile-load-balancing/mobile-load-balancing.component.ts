import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Engine, Runner, Render, World, Constraint, MouseConstraint, Bodies, Mouse, Events, Body} from 'matter-js'

@Component({
  selector: 'app-mobile-load-balancing',
  imports: [],
  templateUrl: './mobile-load-balancing.component.html',
  styleUrl: './mobile-load-balancing.component.css'
})
export class MobileLoadBalancingComponent implements AfterViewInit {

  @ViewChild('gameWrapper') wrapper!: ElementRef;

  width: number = 600;
  height: number = 800;

  engine: Engine = Engine.create();
  render: Render | undefined;

  points: number = 0;
  bodies: Matter.Body[] = [];

  get score(): number {
    return this.points;
  }

  ngAfterViewInit() {
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

    const ground = Bodies.rectangle(this.width / 2, this.height - 20, 410, 60, {
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

    Events.on(this.engine, "afterUpdate", () => {
      this.bodies.forEach(body => {
        if (body.position.y > this.height || body.position.x < 0 || body.position.x > this.width) {
          // Remove bodies that fall below the screen
          World.remove(this.engine.world, body);
          this.bodies = this.bodies.filter(b => b !== body);
          console.log("Body removed:", body);
        } else {
          Body.applyForce(body, body.position, {x: 0, y: body.mass * 0.0001});
        }
      });
      console.log("Engine updated", this.bodies.length);
      this.points = this.bodies.length; // Update points based on the number of bodies
    });

    setInterval(() => {
      // Example of a game action after 5 seconds
      console.log("Game action executed after 5 seconds");

      const x = Math.random() * this.width;
      const y = Math.random() * 100;
      const size = Math.random() * 50 + 20;
      const box = Bodies.rectangle(x, y, size, size);
      this.bodies.push(box);
      World.add(this.engine.world, box);
    }, 3000);
  }
}
