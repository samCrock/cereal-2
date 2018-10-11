import { Component, OnInit } from '@angular/core';
import {TorrentService, DbService, ScrapingService} from '../../services';
import {fade} from '../../animations/fade';

@Component({
  selector: 'app-trending',
  templateUrl: './trending.component.html',
  styleUrls: ['./trending.component.scss'],
  animations: [ fade ]
})
export class TrendingComponent implements OnInit {

  public trending = [];
  public loading: boolean;

  constructor(
    public scrapingService: ScrapingService
  ) {}

  ngOnInit() {
    this.setup();
  }

  setup() {
    this.loading = true;
    this.scrapingService.retrieveTrending().subscribe(shows => {
      // console.log('Retrieved trending', shows);
      this.trending = shows;
      this.loading = false;
    });
  }


}

