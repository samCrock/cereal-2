import { Component, OnInit } from '@angular/core';
import {TorrentService, DbService, ScrapingService} from '../../services';

@Component({
  selector: 'app-trending',
  templateUrl: './trending.component.html',
  styleUrls: ['./trending.component.scss']
})
export class TrendingComponent implements OnInit {

  public trending = [];

  constructor(
    public scrapingService: ScrapingService
  ) {}

  ngOnInit() {
    this.setup();
  }

  setup() {
    this.scrapingService.retrieveTrending().subscribe(shows => {
      // console.log('Retrieved trending', shows);
      this.trending = shows;

    });
  }


}

