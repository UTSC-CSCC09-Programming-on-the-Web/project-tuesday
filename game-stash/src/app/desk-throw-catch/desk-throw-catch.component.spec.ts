import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeskThrowCatchComponent } from './desk-throw-catch.component';

describe('DeskThrowCatchComponent', () => {
  let component: DeskThrowCatchComponent;
  let fixture: ComponentFixture<DeskThrowCatchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeskThrowCatchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeskThrowCatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
