import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/throttleTime';
import 'rxjs/add/observable/fromEvent';
import { ScrapingService } from '../../services/index';
import { TweenMax, TimelineMax } from 'gsap';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {

  public show_input = '';
  public searchControl = new FormControl();
  public searchCtrlSub: Subscription;
  public shows = [];
  public noResults;

  constructor(public scrapingService: ScrapingService) {

  }

  ngOnInit() {

    // TweenMax.fromTo( progress, 5, { width: '0%' }, { width: '100%', yoyo: true, repeat: -1 } );

    const progress = document.getElementById('progress');
    const tl = new TimelineMax({
      repeat: -1,
      repeatDelay: 0
    });
    tl.add(TweenMax.to(progress, 2, { left: '0%', width: '100%' }));
    tl.add(TweenMax.to(progress, 2, { left: '100%', width: '0%' }));
    tl.pause();

    setTimeout(function() {
      document.getElementById('search_input').focus();
    }, 10);

    this.searchCtrlSub = this.searchControl.valueChanges
      .debounceTime(1000)
      .subscribe(newValue => {
        if (newValue.length > 0) {
          if (tl.paused()) {
            tl.duration(2).resume();
          } else { tl.duration(2).play(); }
          this.shows = [];
          this.show_input = newValue;
          this.scrapingService.searchShows(this.show_input)
            .subscribe(result => {
              if (!result) {
                tl.seek(0);
                tl.pause();
                this.noResults = true;
              } else {
                this.noResults = false;
                this.scrapingService.retrieveShow(result)
                  .subscribe(show => {
                    tl.seek(0);
                    tl.pause();
                    this.shows.push(show);
                    // this.shows.reverse();
                    console.log('Search shows result:', show);
                  });
              }
            });
        }
      });
  }

}
