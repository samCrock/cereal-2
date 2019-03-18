import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ScrapingService, DbService, NavbarService, TorrentService } from '../../services';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { fade } from '../../animations/fade';
import { Subscription } from 'rxjs';
import { interval } from 'rxjs/internal/observable/interval';
import * as moment from 'moment';

@Component({
  selector: 'app-show',
  templateUrl: './show.component.html',
  styleUrls: ['./show.component.scss'],
  providers: [ScrapingService, DbService],
  animations: [fade]
})
export class ShowComponent implements OnInit, OnDestroy {

  public title: string;
  public show: {};
  public episodes = [];
  public current_season: number;
  public sanitizedTrailer;
  public openedTrailer = false;
  public loading: boolean;
  public selectedEpisode;
  public progressSubscription: Subscription;


  constructor(
    public scrapingService: ScrapingService,
    public navbarService: NavbarService,
    public torrentService: TorrentService,
    public dbService: DbService,
    public route: ActivatedRoute,
    public sanitizer: DomSanitizer,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    window.scrollTo(0, 0);
    this.init();
  }

  init() {
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
              this.current_season = this.show['watching_season'] ? this.show['watching_season'] : this.show['seasons'];
              if (show.seasons === this.current_season) {
                console.log('this.current_season', this.current_season, dbLastSeason);
                this.episodes = Object.assign(lastSeason, dbLastSeason);
                this.dbService.addSeason(this.show['dashed_title'], this.current_season, this.episodes).subscribe();
                this.loading = false;
              }
              this.retrieveSeason();
            });

        }, () => {
          this.scrapingService.retrieveShow(this.title)
            .subscribe(show => {
              this.show = show;
              this.navbarService.setShow(show);
              // console.log('show from remote', show);
              this.dbService.addShow(this.show);
              this.current_season = this.show['watching_season'] ? this.show['watching_season'] : this.show['seasons'];
              this.retrieveSeason();
            });
        });
    });
  }

  ngOnDestroy() {
    if (this.progressSubscription) { this.progressSubscription.unsubscribe(); }
  }

  retrieveSeason() {
    // console.log('retrieveSeason', this.current_season);
    if (this.show['Seasons'][this.current_season]) {
      console.log('Local', this.current_season, this.show['Seasons'][this.current_season]);
      this.episodes = this.show['Seasons'][this.current_season];
      this.selectedEpisode = this.episodes[0];
      this.fetchGlobalProgress();
      this.loading = false;
    } else {
      this.scrapingService.retrieveShowSeason(this.show['dashed_title'], this.current_season)
        .subscribe(episodes => {
          // console.log('Scraped season', this.current_season, episodes);
          this.episodes = episodes;
          this.selectedEpisode = this.episodes[0];
          this.fetchGlobalProgress();
          this.dbService.addSeason(this.show['dashed_title'], this.current_season, episodes)
            .subscribe(show => {
              // console.log('Season', this.current_season, 'saved');
              this.show = show;
              this.loading = false;
            });
        });
    }
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


  episodeListener(episode) {
    console.log('Episode progress emitter catched!', episode);
    this.episodes.forEach((e, i) => {
      if (e['label'] === episode['label']) {
        this.episodes[i] = Object.assign(this.episodes[i], episode);
      }
    });
    this.fetchGlobalProgress();
  }

  isSelected(episode) {
    return this.selectedEpisode && this.selectedEpisode.label === episode.label;
  }

  selectEpisode(episode) {
    this.selectedEpisode = episode;
    this.fetchGlobalProgress();
  }


  fetchGlobalProgress() {
    // if (this.progressSubscription) { this.progressSubscription.unsubscribe(); }
    this.progressSubscription = interval(1000).subscribe(() => {
      for (const ep in this.episodes) {
        if (this.episodes[ep]) {
          if (this.episodes[ep]['status'] !== 'ready') {
            const t = this.torrentService.getTorrentByHash(this.episodes[ep]['infoHash']);
            if (t) {
              // console.log('Fetch current?', this.episodes[ep]['label'], t['progress'], t['downloadSpeed']);
              if (t['progress'] !== 1) {
                this.episodes[ep]['speed'] = (Math.round(t['downloadSpeed'] / 1048576 * 100) / 100).toString();
                this.episodes[ep]['progress'] = Math.round(t['progress'] * 100);
              } else if (t['progress'] === 1) {
                this.episodes[ep]['progress'] = 100;
                delete this.episodes[ep]['speed'];
                // this.progressSubscription.unsubscribe();
              }
            }
          }
          if (this.episodes[ep]['status'] === 'ready') {
            this.episodes[ep]['progress'] = 100;
            delete this.episodes[ep]['speed'];
            // this.progressSubscription.unsubscribe();
          }
          this.cdRef.detectChanges();
        }
      }
    });
  }

  formatDate(date) {
    if (date) {
      return moment(date, 'YYYY-MM-DD').fromNow();
    }
    if (!date) {
      return 'No air date';
    }
  }


}
