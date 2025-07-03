import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminButtonsComponent } from './admin-buttons.component';

describe('AdminButtonsComponent', () => {
  let component: AdminButtonsComponent;
  let fixture: ComponentFixture<AdminButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminButtonsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
