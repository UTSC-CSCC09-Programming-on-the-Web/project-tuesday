import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileLoadBalancingComponent } from './mobile-load-balancing.component';

describe('MobileLoadBalancingComponent', () => {
  let component: MobileLoadBalancingComponent;
  let fixture: ComponentFixture<MobileLoadBalancingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileLoadBalancingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileLoadBalancingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
