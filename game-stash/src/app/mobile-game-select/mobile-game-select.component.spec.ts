import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileGameSelectComponent } from './mobile-game-select.component';

describe('MobileGameSelectComponent', () => {
  let component: MobileGameSelectComponent;
  let fixture: ComponentFixture<MobileGameSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileGameSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileGameSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
