import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeskLoadBalancingComponent } from './desk-load-balancing.component';

describe('DeskLoadBalancingComponent', () => {
  let component: DeskLoadBalancingComponent;
  let fixture: ComponentFixture<DeskLoadBalancingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeskLoadBalancingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeskLoadBalancingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
