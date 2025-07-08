import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeskCreateLobbyComponent } from './desk-create-lobby.component';

describe('DeskCreateLobbyComponent', () => {
  let component: DeskCreateLobbyComponent;
  let fixture: ComponentFixture<DeskCreateLobbyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeskCreateLobbyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeskCreateLobbyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
