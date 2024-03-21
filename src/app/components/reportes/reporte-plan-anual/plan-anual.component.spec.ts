import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanAnualComponent } from './plan-anual.component';

describe('PlanAnualComponent', () => {
  let component: PlanAnualComponent;
  let fixture: ComponentFixture<PlanAnualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlanAnualComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanAnualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
