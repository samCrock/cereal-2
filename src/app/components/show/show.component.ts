import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ScrapingService, DbService, NavbarService } from '../../services';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import {fade} from '../../animations/fade';

@Component({
  selector: 'app-show',
  templateUrl: './show.component.html',
  styleUrls: ['./show.component.scss'],
  providers: [ScrapingService, DbService],
  animations: [ fade ]
})
export class ShowComponent implements OnInit, OnDestroy {

  public title: string;
  public show: {};
  public episodes = [];
  public current_season: number;
  public alive: boolean;
  public sanitizedTrailer;
  public openedTrailer = false;
  public loading: boolean;

  constructor(
    public scrapingService: ScrapingService,
    public navbarService: NavbarService,
    public dbService: DbService,
    public route: ActivatedRoute,
    public sanitizer: DomSanitizer
    ) {
    this.alive = true;
  }

  ngOnInit() {
    window.scrollTo(0, 0);
    this.loading = true;
    this.route.params.subscribe(params => {
      this.title = params['title'];
      this.dbService.getShow(this.title)
      .subscribe(show => {
        this.show = show;
        this.navbarService.setShow(show);

        this.scrapingService.retrieveShowSeason(show.dashed_title, show.seasons)
        .subscribe(lastSeason => {
          const dbLastSeason = show.Seasons[parseInt(show.seasons, 10)];
          console.log('lastSeason.length', lastSeason.length, dbLastSeason.length);

          if (lastSeason.length > dbLastSeason.length) {
            const missingEpisodes = lastSeason.length - dbLastSeason.length;
            for (let index = 0; index < missingEpisodes; index++) {
              dbLastSeason.push(lastSeason[dbLastSeason.length + index]);
              console.log('Adding episode:', lastSeason[dbLastSeason.length + index]);
            }
          }
          this.loading = false;

        });

        this.current_season = this.show['watching_season'] ? this.show['watching_season'] : this.show['seasons'];
        this.retrieveSeason();
      }, () => {
        this.scrapingService.retrieveShow(this.title)
        .subscribe(show => {
          this.show = show;
          this.navbarService.setShow(show);
          console.log('show from remote', show);
          this.dbService.addShow(this.show);
          this.current_season = this.show['watching_season'] ? this.show['watching_season'] : this.show['seasons'];
          this.retrieveSeason();
        });
      });
    });
  }

  ngOnDestroy() { }

  retrieveSeason() {
    if (this.show['Seasons'][this.current_season]) {
      console.log('Local', this.show['Seasons'][this.current_season]);
      return this.episodes = this.show['Seasons'][this.current_season];
    }
    this.scrapingService.retrieveShowSeason(this.show['dashed_title'], this.current_season)
    .subscribe(episodes => {
      console.log('Scraped season', this.current_season, episodes);
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
