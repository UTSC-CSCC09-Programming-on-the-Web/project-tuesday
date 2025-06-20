import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeskGameSelectComponent } from './desk-game-select.component';

describe('DeskGameSelectComponent', () => {
  let component: DeskGameSelectComponent;
  let fixture: ComponentFixture<DeskGameSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeskGameSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeskGameSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
