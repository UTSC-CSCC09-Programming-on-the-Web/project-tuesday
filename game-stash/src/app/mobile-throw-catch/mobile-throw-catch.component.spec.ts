import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileThrowCatchComponent } from './mobile-throw-catch.component';

describe('MobileThrowCatchComponent', () => {
  let component: MobileThrowCatchComponent;
  let fixture: ComponentFixture<MobileThrowCatchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileThrowCatchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileThrowCatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
