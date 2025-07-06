import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeskMagicNumberComponent } from './desk-magic-number.component';

describe('DeskMagicNumberComponent', () => {
  let component: DeskMagicNumberComponent;
  let fixture: ComponentFixture<DeskMagicNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeskMagicNumberComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeskMagicNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
