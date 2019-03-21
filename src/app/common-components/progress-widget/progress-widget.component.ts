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

  constructor() { }

  update() {
    const relativeProgress = this.progress;
    const x = document.querySelector('.progress-circle-prog') as HTMLElement;
    const el = document.querySelector('.progress-text') as HTMLElement;
    if (x && el) {
      x.style.strokeDasharray = (relativeProgress * 4.65) + ' 999';
      el.setAttribute('value', relativeProgress.toString());
      setTimeout(() => {
        el.innerHTML = relativeProgress + '%';
      }, 10);
    }

  }

  ngOnChanges() {
    if (this.progress) {
      // console.log(this.progress);
      this.progress = parseFloat(this.progress.toString().substring(0, 3)) * 10;
      this.update();
    }
  }

}
