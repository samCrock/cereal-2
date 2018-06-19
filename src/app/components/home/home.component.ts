import { Component, OnInit, ElementRef } from '@angular/core';
import { ScrapingService } from '../../services';
import * as moment from 'moment';
import { Observable } from 'rxjs/Observable';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [ScrapingService]
})
export class HomeComponent implements OnInit {

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
