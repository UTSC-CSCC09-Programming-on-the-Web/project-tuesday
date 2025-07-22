import { Component, OnInit, signal } from '@angular/core';
import { PlayerSocketService } from '../services/player.socket.service';
import { ActivatedRoute, Router } from '@angular/router';
import { map, filter, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-mobile-throw-catch',
  imports: [],
  templateUrl: './mobile-throw-catch.component.html',
  styleUrl: './mobile-throw-catch.component.css'
})
export class MobileThrowCatchComponent implements OnInit {
  lobbyCode = signal('');
  selectedGame = signal('');
  playerName = signal('');
  roundNumber = signal(5);

  permissionGranted: boolean = false;
  
  // values for calculating difference between rotations and accelerations
  rotation: number = 0;
  old_rotation: number = 0;

  acceleration: number = 0;
  old_acceleration: number = 0;

  // values for simulating and calcuting distance
  tracking_motion: boolean = false;
  distance: number = -1;
  old_distance: number = -1;

  constructor(
    private socketService: PlayerSocketService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    console.log("MobileThrowCatchComponent initialized");
    
    // attach event to track motion
    this.socketService.useEffect("queryPlayerThrow", (data: any) => {
      this.tracking_motion = true;
    });

    // subscribe to selectedGame instead of this
    this.socketService.playerState$
    .pipe(
      map(state => state.selectedGame),
      filter(game => !!game), // ignore empty string
      distinctUntilChanged()  // only trigger when game actually changes
    )
    .subscribe(selectedGame => {
      this.socketService.playerEmit('playerReady', {});
    });
  }

  ngAfterViewInit() {
    // subscriptions
    this.route.queryParams.subscribe(params => {
        const lobbyCode = params['lobbyCode'];
        const playerName = params['playerName'];
        const roundNumber = params['roundNumber'];
        const selectedGame = params['selectedGame'] || 'Throw And Catch';

        if (!lobbyCode || !playerName) {
          console.error('Throw And Catch Error: Missing required parameters');
          this.router.navigate(['/mobile-join-lobby']);
          return;
        }

        this.lobbyCode.set(lobbyCode);
        this.playerName.set(playerName);
        this.roundNumber.set(roundNumber ? parseInt(roundNumber) : 1);
        this.selectedGame.set(selectedGame);

        console.log('Throw and Catch: Loaded parameters', {
          lobbyCode: this.lobbyCode(),
          playerName: this.playerName(),
          roundNumber: this.roundNumber(),
          selectedGame: this.selectedGame()
        });
      })

      // get permission to use motion sensors
    document.querySelector('#permission')!.addEventListener('click', () => {

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
          }).catch((error: any) => alert(error));
        } else {
          // seems like for Android some older browsers don't ask you for permission lol
          this.permissionGranted = true;
          this.startMotionListener();
        }
    });
  }

  startMotionListener() {
  window.addEventListener('devicemotion', event => {
    if (!this.tracking_motion || !event.accelerationIncludingGravity) return;

    const acc = event.accelerationIncludingGravity;

    // Get total magnitude of acceleration
    const magnitude = Math.sqrt(
      (acc.x ?? 0) ** 2 +
      (acc.y ?? 0) ** 2 +
      (acc.z ?? 0) ** 2
    );

    // Threshold to detect an intentional throw
    const THROW_THRESHOLD = 18; 

    if (magnitude > THROW_THRESHOLD) {
      this.tracking_motion = false;

      // Normalize force vector (in x/y only)
      const force = {
        x: (acc.x ?? 0) / 100, 
        y: -(acc.y ?? 0) / 100,
      };

      console.log("Throw detected! Force vector:", force);

      // Send to server
      this.socketService.playerEmit("playerThrowData", {
        throwData: force
      });
    }
  });
}
  
}
