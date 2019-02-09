
import {debounceTime} from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';



import { ScrapingService } from '../../services/index';

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
  public loading: boolean;

  constructor(public scrapingService: ScrapingService) {
  }

  ngOnInit() {
    setTimeout(function() {
      document.getElementById('search_input').focus();
    }, 10);

    this.searchCtrlSub = this.searchControl.valueChanges.pipe(
      debounceTime(1000))
      .subscribe(newValue => {
        this.loading = true;
        if (newValue.length > 0) {
          this.shows = [];
          this.show_input = newValue;
          this.scrapingService.searchShows(this.show_input)
            .subscribe(result => {
              if (!result) {
                this.noResults = true;
              } else {
                this.noResults = false;
                this.scrapingService.retrieveShow(result)
                  .subscribe(show => {
                    this.shows.push(show);
                    console.log('Search shows result:', show);
                    this.loading = false;
                  });
              }
            });
        }
      });
  }

}
