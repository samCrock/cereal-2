import {Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {ScrapingService, DbService, NavbarService, TorrentService} from '../../services';
import {ActivatedRoute} from '@angular/router';
import {DomSanitizer} from '@angular/platform-browser';
import {fade} from '../../animations/fade';
import {Subscription} from 'rxjs';
import {interval} from 'rxjs/internal/observable/interval';
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
  public currentSeason: number;
  public currentEpisode: number;
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
  ) {
  }

  ngOnInit() {
    window.scrollTo(0, 0);
    this.init();
  }

  ngOnDestroy() {
    if (this.progressSubscription) {
      this.progressSubscription.unsubscribe();
    }
  }

  init() {
    this.loading = true;
    this.route.params.subscribe(params => {
      this.title = params['title'];
      this.dbService.getShow(this.title)
        .subscribe(show => {
          // Stored show
          this.show = show;
          this.navbarService.setShow(show);
          this.currentSeason = this.show['watching_season'] ? this.show['watching_season'] : this.show['seasons'];
          this.retrieveSeason();
        }, () => {
          // First time
          this.scrapingService.retrieveShow(this.title)
            .subscribe(show => {
              this.show = show;
              this.navbarService.setShow(show);
              this.dbService.addShow(this.show);
              this.currentSeason = this.show['seasons'];
              this.retrieveSeason();
            });
        });
    });
  }

  assignSeason(target, source) {
    target.forEach((episode, i) => {
      if (source && source[i]) {
        episode['dn'] = source[i]['dn'];
        episode['infoHash'] = source[i]['infoHash'];
        episode['magnetURI'] = source[i]['magnetURI'];
        episode['progress'] = source[i]['progress'];
        episode['play_progress'] = source[i]['play_progress'];
        episode['status'] = source[i]['status'];
      }
    });
    return target;
  }

  retrieveSeason() {
    this.scrapingService.retrieveShowSeason(this.show['dashed_title'], this.currentSeason)
      .subscribe(episodes => {
        console.log('Fresh season data', this.currentSeason, episodes, this.show['Seasons'][this.currentSeason]);

        this.episodes = this.assignSeason(episodes, this.show['Seasons'][this.currentSeason]);

        this.currentEpisode = (this.currentSeason === this.show['watching_season'] && this.show['watching_episode']) ?
          this.show['watching_episode'] : 0;
        this.selectedEpisode = this.episodes[this.currentEpisode];
        this.fetchGlobalProgress();

        this.dbService.addSeason(this.show['dashed_title'], this.currentSeason, this.episodes)
          .subscribe(show => {
            console.log('Season', this.currentSeason, 'saved');
            this.show = show;
            // Set containers max height
            this.setMaxHeights();
            this.loading = false;
          });
      });
  }

  setMaxHeights() {
    setTimeout(() => {
      const showHeader = document.getElementsByClassName('show_header')[0] as HTMLElement;
      const episodesContainter = document.getElementsByClassName('episodes-container')[0] as HTMLElement;
      const episodeContainter = document.getElementsByClassName('episode-container')[0] as HTMLElement;
      const h = showHeader.getBoundingClientRect().height;
      episodesContainter.style.maxHeight = 'calc(100vh - ' + h + 'px - 11rem)';
      // episodeContainter.style.maxHeight = 'calc(100vh - ' + h + 'px - 11rem)';
    }, 100);
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
    this.currentSeason++;
    this.retrieveSeason();
  }

  navigate_previous() {
    this.currentSeason--;
    this.retrieveSeason();
  }

  navigate_last() {
    this.currentSeason = this.show['seasons'];
    this.retrieveSeason();
  }

  navigate_first() {
    this.currentSeason = 1;
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

  getEpLabel(episode) {
    return 'Ep ' + episode.split('E')[1];
  }

  isSelected(episode) {
    return this.selectedEpisode && this.selectedEpisode.label === episode.label;
  }

  selectEpisode(episode) {
    if (moment(episode['date'], 'YYYY-MM-DD').diff(moment(), 'hours') < 24) {
      this.selectedEpisode = episode;
      this.fetchGlobalProgress();
    }
  }

  getEpisodeClass(episode) {
    const selected = this.selectedEpisode && this.selectedEpisode.label === episode.label;
    const disabled = !episode['date'] || moment(episode['date'], 'YYYY-MM-DD').diff(moment(), 'hours') > 24;
    if (selected) {
      return 'selected';
    }
    if (disabled) {
      return 'disabled';
    }
    return '';
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
