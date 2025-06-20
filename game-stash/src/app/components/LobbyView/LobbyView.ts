import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { io } from 'socket.io-client';

@Component({
    selector: 'app-lobby-view',
    template: `
        <div class="lobby-view">  
            <p>this is the lobby view</p>
            <p>this is the lobby name: {{ roomId }}</p>
            <button (click)="openNewTab()">make new player</button>
            <br>
            <p>these are the currently connected players</p>
            <div class="current-players"></div>
            <hr>
            <button style="color: green">begin game</button>
        </div>
        `,
    imports: [RouterModule]
})

export class LobbyViewComponent {
    roomId: string = "";
    
    constructor(private router: Router) {
        console.log("lobby component view");
        this.roomId = this.generate();
        this.connectToSocket();
    }

    openNewTab() {
        const url = this.router.serializeUrl( this.router.createUrlTree(['/player', this.roomId]));
        window.open(url, '_blank');
    }    

    // NOTE: The first person to join the room is considered the host.
    connectToSocket() {
        const socket = io("http://localhost:3000/");
        
        socket.on("welcome", (res) => {
            console.log(res.message);
        });

        // Create a new lobby
        socket.on("connect", () => {
            socket.emit("createRoom", this.roomId);
        });

        // If a user leaves the lobby, update the UI accordingly
        socket.on("userJoinedRoom", (message) => { 
            const userId = message.split(" ")[0];
            console.log("user joined room:", message);
            document.querySelector('.current-players')!.innerHTML += `<p id=${userId}>player: ${userId}</p>`;
        }); 

        // If a user leaves the lobby, update the UI accordingly
        socket.on("userLeftRoom", (message) => {
           const userId = message.split(" ")[0]
           console.log("user left room:", message);
           document.querySelector(`#${userId}`)?.remove();
        });
  } 
    
    // TODO: replace
    // Generate a random name for the lobby, stolen from StackOverflow
    generate() {
        const nameList = [
            'Time','Past','Future','Dev',
            'Fly','Flying','Soar','Soaring','Power','Falling',
            'Fall','Jump','Cliff','Mountain','Rend','Red','Blue',
            'Green','Yellow','Gold','Demon','Demonic','Panda','Cat',
            'Kitty','Kitten','Zero','Memory','Trooper','XX','Bandit',
            'Fear','Light','Glow','Tread','Deep','Deeper','Deepest',
            'Mine','Your','Worst','Enemy','Hostile','Force','Video',
            'Game','Donkey','Mule','Colt','Cult','Cultist','Magnum',
            'Gun','Assault','Recon','Trap','Trapper','Redeem','Code',
            'Script','Writer','Near','Close','Open','Cube','Circle',
            'Geo','Genome','Germ','Spaz','Shot','Echo','Beta','Alpha',
            'Gamma','Omega','Seal','Squid','Money','Cash','Lord','King',
            'Duke','Rest','Fire','Flame','Morrow','Break','Breaker','Numb',
            'Ice','Cold','Rotten','Sick','Sickly','Janitor','Camel','Rooster',
            'Sand','Desert','Dessert','Hurdle','Racer','Eraser','Erase','Big',
            'Small','Short','Tall','Sith','Bounty','Hunter','Cracked','Broken',
            'Sad','Happy','Joy','Joyful','Crimson','Destiny','Deceit','Lies',
            'Lie','Honest','Destined','Bloxxer','Hawk','Eagle','Hawker','Walker',
            'Zombie','Sarge','Capt','Captain','Punch','One','Two','Uno','Slice',
            'Slash','Melt','Melted','Melting','Fell','Wolf','Hound',
            'Legacy','Sharp','Dead','Mew','Chuckle','Bubba','Bubble','Sandwich','Smasher','Extreme','Multi','Universe','Ultimate','Death','Ready','Monkey','Elevator','Wrench','Grease','Head','Theme','Grand','Cool','Kid','Boy','Girl','Vortex','Paradox'
        ];

        let finalName = nameList[Math.floor( Math.random() * nameList.length )] + "-" + nameList[Math.floor( Math.random() * nameList.length )] + "-" + nameList[Math.floor( Math.random() * nameList.length )];
        console.log("generated name:", finalName);
        return finalName;
    };
}