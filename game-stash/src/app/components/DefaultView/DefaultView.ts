import { Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

@Component({
    selector: 'app-default-view',
    template: `
        <div>
        <p>this is the default view</p>
            <button [routerLink]="['/lobby']">Lobby View</button>
            <router-outlet></router-outlet>
        </div>
        `,
    imports: [RouterModule]
})

export class DefaultViewComponent {
  
    constructor() {
        console.log("default view");
        // Initialization logic for the PlayerView component
    }
}