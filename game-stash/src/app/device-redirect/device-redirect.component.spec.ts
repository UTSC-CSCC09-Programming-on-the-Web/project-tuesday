import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceRedirectComponent } from './device-redirect.component';

describe('DeviceRedirectComponent', () => {
  let component: DeviceRedirectComponent;
  let fixture: ComponentFixture<DeviceRedirectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceRedirectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceRedirectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
