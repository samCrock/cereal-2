import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowPreviewComponent } from './show-preview.component';

describe('ShowPreviewComponent', () => {
  let component: ShowPreviewComponent;
  let fixture: ComponentFixture<ShowPreviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShowPreviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
