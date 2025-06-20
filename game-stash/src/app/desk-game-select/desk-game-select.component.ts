import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-desk-game-select',
  imports: [],
  templateUrl: './desk-game-select.component.html',
  styleUrl: './desk-game-select.component.css'
})
export class DeskGameSelectComponent {
  @Input() lobbyName: string = '';
  @Input() lobbyCode: string = '';

  ngOnInit() {
    console.log('DeskGameSelectComponent initialized with lobbyName:', this.lobbyName, 'and lobbyCode:', this.lobbyCode);
  }
}
