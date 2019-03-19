import { Component, Input, OnInit } from '@angular/core';
import * as moment from 'moment';

@Component({
  selector: 'app-date-widget',
  templateUrl: './date-widget.component.html',
  styleUrls: ['./date-widget.component.scss'],
  providers: []
})

export class DateWidgetComponent implements OnInit {

  @Input() date;

  constructor() { }

  ngOnInit() {
    console.log('DateWidgetComponent', this.date);
  }

  formatFromNowDate() {
    let d = moment(this.date, 'DD-MM-YYYY').from(moment().startOf('day'));
    if (d === 'a day ago') { d = 'Yesterday'; }
    if (d === 'a few seconds ago') { d = 'Today'; }
    return d;
  }

  formatWeekDate() {
    return moment(this.date, 'DD-MM-YYYY').format('dddd');
  }

  formatMonthDate() {
    return moment(this.date, 'DD-MM-YYYY').format('D');
  }

}
