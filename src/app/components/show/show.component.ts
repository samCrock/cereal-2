import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ScrapingService, DbService, NavbarService } from '../../services';
import * as moment from 'moment';
import { Observable } from 'rxjs/Observable';
import { ActivatedRoute } from '@angular/router';
import { IntervalObservable } from 'rxjs/observable/IntervalObservable';
import { Subscription } from 'rxjs/Subscription';
import * as magnet from 'magnet-uri';
import { ElectronService } from 'ngx-electron';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-show',
  templateUrl: './show.component.html',
  styleUrls: ['./show.component.scss'],
  providers: [ScrapingService, DbService]
})
export class ShowComponent implements OnInit, OnDestroy {

  private title: string;
  private show: {};
  private episodes = [];
  private current_season: number;
  private alive: boolean;
  private minified = false;
  private sanitizedTrailer;
  private openedTrailer = false;

  constructor(
    private scrapingService: ScrapingService,
    private navbarService: NavbarService,
    private dbService: DbService,
    private route: ActivatedRoute,
    private electronService: ElectronService,
    private sanitizer: DomSanitizer
  ) {
    this.alive = true;
  }

  ngOnInit() {
    window.scrollTo(0, 0);
    this.route.params.subscribe(params => {
      this.title = params['title'];
      this.dbService.getShow(this.title)
        .subscribe(show => {
          this.show = show;
          this.navbarService.setShow(show);
          console.log('show from db', show);
          this.current_season = this.show['seasons'];
          this.retrieveSeason();
        }, () => {
          this.scrapingService.retrieveShow(this.title)
            .subscribe(show => {
              this.show = show;
              this.navbarService.setShow(show);
              console.log('show from remote', show);
              this.dbService.addShow(this.show);
              this.current_season = this.show['seasons'];
              this.retrieveSeason();
            });
        });
    });
  }

  ngOnDestroy() { }

  retrieveSeason() {
    if (this.show['Seasons'][this.current_season]) {
      return this.episodes = this.show['Seasons'][this.current_season];
    }
    this.scrapingService.retrieveShowSeason(this.show['dashed_title'], this.current_season)
      .subscribe(episodes => {
        console.log('Season', this.current_season, episodes);
        this.episodes = episodes;
        this.dbService.addSeason(this.show['dashed_title'], this.current_season, episodes)
          .subscribe(show => {
            console.log('Season', this.current_season, 'saved');
            this.show = show;
          });
      });
  }

  play_trailer() {
    this.openedTrailer = true;
  }

  getTrailer() {
    if (!this.sanitizedTrailer) {
      this.sanitizedTrailer = this.sanitizer.bypassSecurityTrustResourceUrl(this.show['trailer'].replace('watch?v=', 'embed/'));
    }
    return this.sanitizedTrailer;
  }

  closeTrailer() {
    this.openedTrailer = false;
  }

  // NAVIGATION
  navigate_next() {
    this.current_season++;
    this.retrieveSeason();
  }
  navigate_previous() {
    this.current_season--;
    this.retrieveSeason();
  }
  navigate_last() {
    this.current_season = this.show['seasons'];
    this.retrieveSeason();
  }
  navigate_first() {
    this.current_season = 1;
    this.retrieveSeason();
  }
  /////////////


}
