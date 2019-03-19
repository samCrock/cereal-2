import { Component, Input, Output, OnDestroy, EventEmitter, OnChanges } from '@angular/core';
import { DbService, SubsService, ScrapingService, TorrentService, WtService } from '../../services';
import * as moment from 'moment';
import { ElectronService } from 'ngx-electron';
import { Router } from '@angular/router';
import * as magnet from 'magnet-uri';
import { ChangeDetectorRef } from '@angular/core';
import { interval } from 'rxjs/internal/observable/interval';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-episode',
  templateUrl: './episode.component.html',
  styleUrls: ['./episode.component.scss'],
  providers: [DbService, ScrapingService, SubsService, TorrentService, WtService]

})
export class EpisodeComponent implements OnChanges, OnDestroy {

  @Input() show;
  @Input() episode;
  @Input() mode;
  @Output() updatedEpisode: EventEmitter<any> = new EventEmitter<any>();

  public path = this.electronService.remote.getGlobal('path');
  public shell = this.electronService.remote.getGlobal('shell');
  public app = this.electronService.remote.getGlobal('app');
  public fsExtra = this.electronService.remote.getGlobal('fsExtra');

  public expanded = false;
  public epTorrents = [];
  public selectedTorrent;
  public titleAsButton = false;
  public loading: boolean;
  public hasResults: boolean;
  public currentTorrentsListSub;

  public progress;
  public speed;
  public progressSubscription: Subscription;
  public speedSubscription: Subscription;

  constructor(
    public dbService: DbService,
    public scrapingService: ScrapingService,
    public subsService: SubsService,
    public torrentService: TorrentService,
    public electronService: ElectronService,
    public wtService: WtService,
    public router: Router,
    private cdRef: ChangeDetectorRef
  ) {
  }

  ngOnChanges() {
    this.setup();
  }

  ngOnDestroy() {
    this.progressSubscription.unsubscribe();
  }

  setup() {

    delete this.progress;
    delete this.speed;

    this.fetchProgress();

    this.toggleExtra(this.episode);

    if (!this.show) {
      this.dbService.getShow(this.episode['dashed_title'])
        .subscribe(show => {
          this.show = show;
        });
    }
    if (this.episode['episode_label']) {
      this.episode['label'] = this.episode['episode_label'];
    }
    if (this.router.url === '/torrents') {
      this.titleAsButton = true;
    }

    this.cdRef.detectChanges();

  }

  formatDate(date) {
    if (date) {
      return moment(date, 'YYYY-MM-DD').fromNow();
    }
    if (!date) {
      return 'No air date';
    }
  }

  downloadable(airDate) {
    return moment(airDate, 'YYYY-MM-DD').diff(moment(), 'hours') < 24;
  }

  fetchProgress() {
    this.progressSubscription = interval(500).subscribe(() => {
      if (this.episode['dn'] && this.episode['status'] === 'pending') {
        const t = this.torrentService.getTorrentByHash(this.episode['infoHash']);

        // console.log('Fetch current?', this.episode['infoHash'], t['progress'], t['downloadSpeed'], t['path']);

        if (t) {
          if (t['progress'] !== 1) {
            this.speed = (Math.round(t['downloadSpeed'] / 1048576 * 100) / 100).toString();
            this.progress = Math.round(t['progress'] * 100);
          } else {
            this.progress = 100;
            delete this.speed;
            this.progressSubscription.unsubscribe();
          }
        }

      }
      if (this.episode['status'] === 'ready') {
        this.progress = 100;
        delete this.speed;
        this.progressSubscription.unsubscribe();
      }
      this.cdRef.detectChanges();
    });
  }

  isPlayable() {
    // return this.episode['status'] && this.progress > 0;
    return this.episode['status'];
  }

  download_episode(episode) {
    this.loading = true;
    console.log('download_episode', episode);
    // Retrieve episode from db
    let result;
    this.dbService.getEpisode(this.show['dashed_title'], episode['label'])
      .subscribe(dbEpisode => {
        console.log('dbEpisode', dbEpisode);
        result = dbEpisode;

        // Scrape torrent
        this.scrapingService.retrieveEpisode(this.show['title'], episode.label)
          .subscribe(scrapedEpisode => {
            console.log('scrapedEpisode', scrapedEpisode);
            if (!scrapedEpisode) { return this.loading = false; }
            if (!result.magnetURI) { result.magnetURI = scrapedEpisode.magnetURI; }
            // Set dn
            result.dn = scrapedEpisode.dn;
            // Set infohash
            result.infoHash = magnet.decode(result['magnetURI']).infoHash;

            // Add torrent to WT client
            const ep = {
              magnetURI: result.magnetURI,
              title: this.show['title'],
              episode_label: result.label
            };
            this.torrentService.addTorrent(ep).subscribe();
            // Add episode torrent to torrents & shows DB
            this.dbService.addTorrent({
              dn: result['dn'],
              infoHash: result.infoHash,
              magnetURI: result.magnetURI,
              dashed_title: this.show['dashed_title'],
              title: this.show['title'],
              episode_label: result.label,
              status: 'pending',
              date: result.date
            }).subscribe(show => {
              this.show = show;
              this.dbService.getEpisode(this.show['dashed_title'], this.episode['label'])
                .subscribe(ep => {
                  this.episode = ep;
                  this.setup();
                  // if (this.expanded) {
                  //   this.toggleExtra(episode);
                  // }
                  this.updatedEpisode.emit(ep);
                  this.loading = false;
                });
            });

          });

      });
  }


  play() {
    this.loading = false;
    this.episode.dashed_title = this.show.dashed_title;
    this.dbService.setEpisode(this.episode).subscribe(_t => {
      this.updatedEpisode.emit(this.episode);
    });
    this.router.navigate(['play', { show: this.show['dashed_title'], episode: this.episode['label'] }]);
  }

  isCurrent() {
    let isCurrent = false;
    let current = localStorage.getItem('play');
    if (current) {
      current = JSON.parse(current);
      if (current['show']['dashed_title'] === this.show['dashed_title'] && current['episode']['label'] === this.episode['label']) {
        isCurrent = true;
      }
    }
    return isCurrent;
  }

  toggleExtra(episode) {
    this.epTorrents = [];
    this.loading = true;
    this.scrapingService.retrieveTorrentsList(this.mode === 'compact' ? episode.title : this.show['title'], episode.label)
      .subscribe(result => {
        this.hasResults = true;
        this.loading = false;
        this.epTorrents.push(result);
      });
  }


  onTorrentChange(episode, t) {
    this.selectedTorrent = t;
    const ep = {
      dashed_title: this.show['dashed_title'],
      label: episode['label'],
      dn: t.name,
      magnetURI: t.magnetURI
    }
    this.dbService.setEpisode(ep).subscribe(_t => {
      this.updatedEpisode.emit(ep);
    });
  }

  deleteTorrent(episode) {
    this.loading = true;

    this.epTorrents = [];

    episode['dashed_title'] = this.show['dashed_title'];
    episode['episode_label'] = episode['label'];

    this.dbService.getEpisode(this.show['dashed_title'], episode['episode_label'])
      .subscribe(dbEpisode => {
        console.log('Deleting', dbEpisode);

        this.torrentService.removeTorrent(dbEpisode).subscribe(result => {
          console.log('Torrent Episode deletion:', result);

          // delete files
          const folderPath = this.path.join(this.app.getPath('downloads'), 'Cereal', this.show['title'], episode['episode_label']);
          console.log('Deleting all files from directory:', folderPath);
          this.fsExtra.remove(folderPath, err => {
            if (err) { console.error(err); }
          });

          this.expanded = false;
          this.loading = false;
        });


        // delete from db show
        this.dbService.deleteEpisode(episode).subscribe(() => {
          console.log('DB Episode deleted');
          this.dbService.getEpisode(this.show['dashed_title'], this.episode['label'])
            .subscribe(ep => {
              delete this.progress;
              delete this.speed;
              this.episode = ep;
              this.episode['dashed_title'] = this.show['dashed_title'];
              this.setup();
            });
        });

        // delete from torrent client
        this.dbService.getTorrents().subscribe(torrents => {
          torrents.forEach(t => {
            if (t['dashed_title'] === episode['dashed_title'] && t['episode_label'] && episode['episode_label']) {
              this.dbService.deleteTorrent(t.infoHash).subscribe();
              this.torrentService.removeTorrent(t.infoHash).subscribe();
            }
          });
        });

      });



  }


}
