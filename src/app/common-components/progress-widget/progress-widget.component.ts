import { Component, Input, OnChanges } from '@angular/core';
import * as moment from 'moment';

@Component({
  selector: 'app-progress-widget',
  templateUrl: './progress-widget.component.html',
  styleUrls: ['./progress-widget.component.scss'],
  providers: []
})

export class ProgressWidgetComponent implements OnChanges {

  @Input() progress;
  @Input() speed;

  constructor() {}

  update() {
    const rand = this.progress;
    const x = document.querySelector('.progress-circle-prog');
    x.style.strokeDasharray = (rand * 4.65) + ' 999';
    const el = document.querySelector('.progress-text');
    console.log(el);
    el.value = rand.toString();
    setTimeout(() => {
      el.innerHTML = rand + '%';
    }, 10);
  }

  ngOnChanges() {
    if (this.progress) { this.update(); }
  }

}
