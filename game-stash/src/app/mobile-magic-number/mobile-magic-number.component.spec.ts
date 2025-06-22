import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileMagicNumberComponent } from './mobile-magic-number.component';

describe('MobileMagicNumberComponent', () => {
  let component: MobileMagicNumberComponent;
  let fixture: ComponentFixture<MobileMagicNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileMagicNumberComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileMagicNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
