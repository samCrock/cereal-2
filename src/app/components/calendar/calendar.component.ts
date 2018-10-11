import { Component, OnInit, ElementRef } from '@angular/core';
import { ScrapingService } from '../../services';
import * as moment from 'moment';
import { Router } from '@angular/router';
import {fade} from '../../animations/fade';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  providers: [ScrapingService],
  animations: [ fade ]
})
export class CalendarComponent implements OnInit {

  public calendar = [];
  public hovering_episode = {};

  formatFromNowDate(date) {
    let d = moment(date, 'DD-MM-YYYY').from(moment().startOf('day'));
    if (d === 'a day ago') { d = 'Yesterday'; }
    if (d === 'a few seconds ago') { d = 'Today'; }
    return d;
  }

  formatWeekDate(date) {
    return moment(date, 'DD-MM-YYYY').format('dddd');
  }

  formatMonthDate(date) {
    return moment(date, 'DD-MM-YYYY').format('D');
  }

  constructor(private scrapingService: ScrapingService, private router: Router, private elRef: ElementRef) { }

  ngOnInit() {
    console.log('Retrieve calendar..');
    this.scrapingService.retrieveCalendar()
    .subscribe(
      result => {
        console.log('calendar', result);
        this.calendar = result.reverse();
      },
      error => {
        console.log('Cannot load calendar', error);
      });
  }

}
